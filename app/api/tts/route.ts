import { TTS_VOICE_ID, TTS_MODEL_ID, TTS_VOICE_SETTINGS } from '@/lib/prompts';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const { text } = await request.json();

  const cleanedText = (text as string)
    .replace(/\.\.\./g, '\n')
    .replace(/…/g, '\n');

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${TTS_VOICE_ID}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text: cleanedText,
        model_id: TTS_MODEL_ID,
        voice_settings: TTS_VOICE_SETTINGS,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error('ElevenLabs TTS error', res.status, err);
    return new Response(err, { status: 502 });
  }

  const mp3 = await res.arrayBuffer();

  return new Response(mp3, {
    headers: { 'Content-Type': 'audio/mpeg' },
  });
}
