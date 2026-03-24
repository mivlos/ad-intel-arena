import { GoogleGenAI } from '@google/genai';
import { SYSTEM_PROMPT } from '@/lib/systemPrompt';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const { query } = await request.json();

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await ai.models.generateContentStream({
          model: 'gemini-2.5-pro',
          config: {
            systemInstruction: SYSTEM_PROMPT,
          },
          contents: [{ role: 'user', parts: [{ text: query }] }],
        });

        let totalTokens = 0;

        for await (const chunk of response) {
          const text = chunk.text;
          if (text) {
            const data = JSON.stringify({ type: 'text', content: text });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
          if (chunk.usageMetadata) {
            totalTokens =
              (chunk.usageMetadata.promptTokenCount ?? 0) +
              (chunk.usageMetadata.candidatesTokenCount ?? 0);
          }
        }

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: 'done', tokens: totalTokens || undefined })}\n\n`
          )
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'error', message })}\n\n`)
        );
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
