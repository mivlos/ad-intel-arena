export const dynamic = 'force-dynamic';

const BASE_URL = 'https://www.sandbox.zappi.io/zappi-ai/api/v1';
const POLL_INTERVAL_MS = 2500;
const MAX_POLLS = 30;
const MAX_TURNS = 4; // Auto-continue up to N turns

export async function POST(request: Request) {
  const apiKey = process.env.ZAPPI_API_KEY;
  const assistantId = process.env.ZAPPI_ASSISTANT_ID;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        if (!apiKey || !assistantId) {
          send({
            type: 'error',
            message:
              'Zappi API not configured — add ZAPPI_API_KEY and ZAPPI_ASSISTANT_ID to environment',
          });
          return;
        }

        const { query } = await request.json();

        send({ type: 'replace', content: '🔌 Connecting to Zappi...' });

        // Step 1: Create session with initial query
        const sessionRes = await fetch(`${BASE_URL}/agent_sessions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
          },
          body: JSON.stringify({
            user_assistant_id: parseInt(assistantId, 10),
            message: query,
          }),
        });

        if (!sessionRes.ok) {
          const text = await sessionRes.text();
          send({ type: 'error', message: `Zappi session error: ${sessionRes.status} ${text}` });
          return;
        }

        const { session_id } = await sessionRes.json();

        send({ type: 'replace', content: '🔍 Zappi is analysing your query...' });

        // Step 2: Poll + auto-continue loop
        let turns = 0;
        let allAgentMessages: string[] = [];
        let finalResponse = '';

        while (turns < MAX_TURNS) {
          // Wait for current turn to complete
          const messages = await pollUntilReady(session_id, apiKey, send);
          if (!messages) {
            send({ type: 'error', message: 'Zappi timed out waiting for response' });
            return;
          }

          // Extract agent messages from this turn (exclude api-* senders and tool calls)
          const agentMsgs = messages.filter(
            (m: ZappiMessage) =>
              m.type === 'message' && !m.sender.startsWith('api-')
          );

          // Get the latest agent message
          const latestMsg = agentMsgs[agentMsgs.length - 1];
          if (!latestMsg) break;

          const content = typeof latestMsg.content === 'string' ? latestMsg.content : '';
          allAgentMessages.push(content);

          // Show progress
          send({
            type: 'replace',
            content: allAgentMessages.join('\n\n---\n\n'),
          });

          // Check if Zappi is asking for clarification or planning
          const needsContinuation = isAskingToProceed(content);

          if (!needsContinuation) {
            // This looks like a final answer
            finalResponse = allAgentMessages.join('\n\n---\n\n');
            break;
          }

          // Auto-continue: send a follow-up to keep it going
          turns++;
          if (turns >= MAX_TURNS) {
            finalResponse = allAgentMessages.join('\n\n---\n\n');
            break;
          }

          send({
            type: 'replace',
            content: allAgentMessages.join('\n\n---\n\n') + '\n\n⏳ *Querying database...*',
          });

          const continueMsg = getContinuationMessage(content);
          const followUpRes = await fetch(
            `${BASE_URL}/agent_sessions/${session_id}/messages`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
              },
              body: JSON.stringify({ message: continueMsg }),
            }
          );

          if (!followUpRes.ok) {
            finalResponse = allAgentMessages.join('\n\n---\n\n');
            break;
          }
        }

        if (!finalResponse) {
          finalResponse = allAgentMessages.join('\n\n---\n\n') || 'No response from Zappi';
        }

        send({ type: 'replace', content: finalResponse });
        send({ type: 'done', tokens: 0 });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        send({ type: 'error', message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

interface ZappiMessage {
  id: number;
  type: string;
  sender: string;
  recipient: string;
  content: string | object;
  created_at: string;
}

async function pollUntilReady(
  sessionId: number,
  apiKey: string,
  send: (data: object) => void
): Promise<ZappiMessage[] | null> {
  let polls = 0;

  while (polls < MAX_POLLS) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    polls++;

    const pollRes = await fetch(
      `${BASE_URL}/agent_sessions/${sessionId}/messages`,
      { headers: { 'x-api-key': apiKey } }
    );

    if (!pollRes.ok) continue;

    const data = await pollRes.json();
    const status = data.status;

    if (status === 'awaiting_input') {
      return data.messages || [];
    }

    if (status === 'engaging_agent') {
      // Still processing — show a progress indicator
      const toolCalls = (data.messages || []).filter(
        (m: ZappiMessage) => m.type === 'function_call' || m.type === 'internal_tool_type'
      );
      if (toolCalls.length > 0) {
        send({
          type: 'replace',
          content: `🔍 Zappi is querying its database... (${toolCalls.length} queries executed)`,
        });
      }
    }
  }

  return null;
}

function isAskingToProceed(content: string): boolean {
  const lower = content.toLowerCase();
  const proceedPatterns = [
    'would you like',
    'please specify',
    'could you please',
    'i need you to provide',
    'please provide',
    'please let me know',
    'here\'s how i\'ll approach',
    'first, i\'ll check',
    'i\'ll proceed to',
    'here are your options',
    'would you prefer',
    'shall i',
  ];
  return proceedPatterns.some((p) => lower.includes(p));
}

function getContinuationMessage(lastContent: string): string {
  const lower = lastContent.toLowerCase();

  // If asking about broadening filters or relaxing constraints
  if (lower.includes('broaden') || lower.includes('relax') || lower.includes('extend the time')) {
    return 'Yes, please broaden the analysis — remove the age filter and extend the time window to get the most comprehensive view. Provide whatever insights are available.';
  }

  // If asking for product category
  if (lower.includes('product category') && lower.includes('specify')) {
    return 'Please use the broadest relevant category available. If multiple match, include all of them.';
  }

  // If asking for country
  if (lower.includes('country') && lower.includes('specify')) {
    return 'United States, but if data is limited, include United Kingdom as well for comparison.';
  }

  // Default: just proceed
  return 'Yes, please proceed with the analysis using the broadest available data. Provide your findings and recommendations.';
}
