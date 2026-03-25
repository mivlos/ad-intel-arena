export const dynamic = 'force-dynamic';

const BASE_URL = 'https://www.sandbox.zappi.io/zappi-ai/api/v1';
const POLL_INTERVAL_MS = 2500;
const MAX_POLLS = 30;

interface ZappiMessage {
  id: number;
  type: string;
  sender: string;
  recipient: string;
  content: string | object;
  created_at: string;
}

async function pollUntilAwaiting(
  sessionId: string | number,
  apiKey: string
): Promise<ZappiMessage[] | null> {
  let polls = 0;
  while (polls < MAX_POLLS) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    polls++;

    const res = await fetch(`${BASE_URL}/agent_sessions/${sessionId}/messages`, {
      headers: { 'x-api-key': apiKey },
    });

    if (!res.ok) continue;

    const data = await res.json();
    if (data.status === 'awaiting_input') {
      return data.messages ?? [];
    }
  }
  return null;
}

function extractLastAgentResponse(messages: ZappiMessage[]): string {
  const agentMsgs = messages.filter(
    (m) => m.type === 'message' && !m.sender.startsWith('api-')
  );
  const last = agentMsgs[agentMsgs.length - 1];
  if (!last) return '';
  return typeof last.content === 'string' ? last.content : JSON.stringify(last.content);
}

export async function POST(request: Request) {
  const apiKey = process.env.ZAPPI_API_KEY;
  const assistantId = process.env.ZAPPI_ASSISTANT_ID;

  if (!apiKey || !assistantId) {
    return Response.json(
      { error: 'Zappi API not configured — add ZAPPI_API_KEY and ZAPPI_ASSISTANT_ID to environment' },
      { status: 500 }
    );
  }

  let body: { message?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { message } = body;
  if (!message?.trim()) {
    return Response.json({ error: 'message is required' }, { status: 400 });
  }

  const startTime = Date.now();

  // Create session with first message
  const sessionRes = await fetch(`${BASE_URL}/agent_sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      user_assistant_id: parseInt(assistantId, 10),
      message,
    }),
  });

  if (!sessionRes.ok) {
    const text = await sessionRes.text();
    return Response.json(
      { error: `Zappi session error: ${sessionRes.status} ${text}` },
      { status: 502 }
    );
  }

  const { session_id } = await sessionRes.json();

  // Poll until Zappi is awaiting input
  const messages = await pollUntilAwaiting(session_id, apiKey);
  if (!messages) {
    return Response.json({ error: 'Zappi timed out waiting for response' }, { status: 504 });
  }

  const response = extractLastAgentResponse(messages);
  const elapsed_ms = Date.now() - startTime;

  return Response.json({ session_id: String(session_id), response, elapsed_ms });
}
