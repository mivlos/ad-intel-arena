export const dynamic = 'force-dynamic';

const BASE_URL = 'https://www.sandbox.zappi.io/zappi-ai/api/v1';
const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 60;

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

        send({ type: 'text', content: 'Connecting...' });

        const sessionRes = await fetch(`${BASE_URL}/agent_sessions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
          },
          body: JSON.stringify({ user_assistant_id: assistantId, message: query }),
        });

        if (!sessionRes.ok) {
          const text = await sessionRes.text();
          send({ type: 'error', message: `Zappi session error: ${sessionRes.status} ${text}` });
          return;
        }

        const { session_id } = await sessionRes.json();

        send({ type: 'replace', content: 'Processing...' });

        let status = 'engaging_agent';
        let polls = 0;
        let messages: Array<{ role: string; content: string }> = [];

        while (status === 'engaging_agent' && polls < MAX_POLLS) {
          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
          polls++;

          const pollRes = await fetch(
            `${BASE_URL}/agent_sessions/${session_id}/messages`,
            { headers: { 'x-api-key': apiKey } }
          );

          if (!pollRes.ok) {
            const text = await pollRes.text();
            send({ type: 'error', message: `Zappi poll error: ${pollRes.status} ${text}` });
            return;
          }

          const data = await pollRes.json();
          status = data.status ?? status;
          messages = data.messages ?? [];
        }

        if (status !== 'awaiting_input') {
          send({ type: 'error', message: `Zappi timed out (status: ${status})` });
          return;
        }

        const agentMessages = messages.filter((m) => m.role === 'assistant');
        const lastMessage = agentMessages[agentMessages.length - 1];

        if (!lastMessage) {
          send({ type: 'error', message: 'Zappi returned no response' });
          return;
        }

        send({ type: 'replace', content: lastMessage.content });
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
