import { GoogleGenerativeAI } from '@google/generative-ai';
import { MODEL_NAME, GENERATION_CONFIG, sessionPrompt } from '@/lib/prompts';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const { target, presence } = await request.json();

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: GENERATION_CONFIG,
  });

  const prompt = sessionPrompt(target as string, presence as string);
  const streamResult = await model.generateContentStream(prompt);

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const chunk of streamResult.stream) {
          const text = chunk.text();
          if (text) {
            controller.enqueue(encoder.encode(text));
          }
        }
      } catch (err) {
        controller.error(err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-cache, no-transform',
    },
  });
}
