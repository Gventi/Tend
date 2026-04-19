import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  MODEL_NAME,
  GENERATION_CONFIG,
  liminalKarunaPrompt,
  liminalMettaPrompt,
  liminalBreathPrompt,
  liminalIntentionPrompt,
} from '@/lib/prompts';

export const runtime = 'nodejs';

const PROMPT_MAP = {
  karuna: liminalKarunaPrompt,
  metta: liminalMettaPrompt,
  breath: liminalBreathPrompt,
  intention: liminalIntentionPrompt,
} as const;

type Component = keyof typeof PROMPT_MAP;

export async function POST(request: Request) {
  const { component, carrying } = await request.json();

  if (!(component in PROMPT_MAP)) {
    return new Response('Unknown component', { status: 400 });
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const isIntention = component === 'intention';

  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: isIntention
      ? { ...GENERATION_CONFIG, maxOutputTokens: 128 }
      : GENERATION_CONFIG,
  });

  const prompt = PROMPT_MAP[component as Component](carrying as string ?? '');

  if (isIntention) {
    const result = await model.generateContent(prompt);
    return Response.json({ text: result.response.text() });
  }

  const streamResult = await model.generateContentStream(prompt);

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const chunk of streamResult.stream) {
          const text = chunk.text();
          if (text) controller.enqueue(encoder.encode(text));
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
      'Cache-Control': 'no-cache, no-transform',
    },
  });
}
