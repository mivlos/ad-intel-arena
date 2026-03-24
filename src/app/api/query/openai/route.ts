import OpenAI from 'openai';
import { SYSTEM_PROMPT } from '@/lib/systemPrompt';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const { query } = await request.json();

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const streamResponse = await client.chat.completions.create({
          model: 'o3',
          messages: [
            { role: 'developer', content: SYSTEM_PROMPT },
            { role: 'user', content: query },
          ],
          stream: true,
          max_completion_tokens: 2048,
        });

        let totalTokens = 0;

        for await (const chunk of streamResponse) {
          const text = chunk.choices[0]?.delta?.content ?? '';
          if (text) {
            const data = JSON.stringify({ type: 'text', content: text });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
          if (chunk.usage) {
            totalTokens =
              (chunk.usage.prompt_tokens ?? 0) +
              (chunk.usage.completion_tokens ?? 0);
          }
        }

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: 'done', tokens: totalTokens || undefined })}\n\n`
          )
        );
      } catch (err) {
        // Fall back to gpt-4o if o3 is unavailable
        if (
          err instanceof Error &&
          (err.message.includes('model') || err.message.includes('o3'))
        ) {
          try {
            const fallbackStream = await client.chat.completions.create({
              model: 'gpt-4o',
              messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: query },
              ],
              stream: true,
              max_tokens: 2048,
            });

            for await (const chunk of fallbackStream) {
              const text = chunk.choices[0]?.delta?.content ?? '';
              if (text) {
                const data = JSON.stringify({ type: 'text', content: text });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              }
            }

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
            );
          } catch (fallbackErr) {
            const message =
              fallbackErr instanceof Error ? fallbackErr.message : 'Unknown error';
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: 'error', message })}\n\n`
              )
            );
          }
        } else {
          const message = err instanceof Error ? err.message : 'Unknown error';
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'error', message })}\n\n`
            )
          );
        }
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
