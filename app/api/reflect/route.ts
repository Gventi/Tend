import { GoogleGenerativeAI } from '@google/generative-ai';
import { MODEL_NAME, GENERATION_CONFIG, reflectPrompt } from '@/lib/prompts';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const { sessionContent } = await request.json();

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: { ...GENERATION_CONFIG, maxOutputTokens: 256 },
  });

  const prompt = reflectPrompt(sessionContent as string);
  const result = await model.generateContent(prompt);
  const text = result.response.text();

  return Response.json({ prompt: text });
}
