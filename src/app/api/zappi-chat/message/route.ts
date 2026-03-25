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
  sessionId: string,
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

  if (!apiKey) {
    return Response.json(
      { error: 'Zappi API not configured — add ZAPPI_API_KEY to environment' },
      { status: 500 }
    );
  }

  let body: { session_id?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { session_id, message } = body;
  if (!session_id?.trim()) {
    return Response.json({ error: 'session_id is required' }, { status: 400 });
  }
  if (!message?.trim()) {
    return Response.json({ error: 'message is required' }, { status: 400 });
  }

  const startTime = Date.now();

  // Send follow-up message to existing session
  const sendRes = await fetch(`${BASE_URL}/agent_sessions/${session_id}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({ message }),
  });

  if (!sendRes.ok) {
    const text = await sendRes.text();
    return Response.json(
      { error: `Zappi message error: ${sendRes.status} ${text}` },
      { status: 502 }
    );
  }

  // Poll until Zappi is awaiting input again
  const messages = await pollUntilAwaiting(session_id, apiKey);
  if (!messages) {
    return Response.json({ error: 'Zappi timed out waiting for response' }, { status: 504 });
  }

  const response = extractLastAgentResponse(messages);
  const elapsed_ms = Date.now() - startTime;

  return Response.json({ response, elapsed_ms });
}
