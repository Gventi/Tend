import { TTS_MODEL_NAME, TTS_VOICE } from '@/lib/prompts';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const { text } = await request.json();

  // Ellipsis characters terminate Gemini TTS early — replace with a breath pause
  const cleanedText = (text as string)
    .replace(/\.\.\./g, '\n')
    .replace(/…/g, '\n');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${TTS_MODEL_NAME}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: cleanedText }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: TTS_VOICE },
            },
          },
        },
      }),
    }
  );

  if (!res.ok) {
    return new Response('TTS request failed', { status: 502 });
  }

  const data = await res.json();
  const inlineData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData;

  if (!inlineData?.data) {
    return new Response('No audio in response', { status: 502 });
  }

  const wav = pcmToWav(inlineData.data);

  return new Response(new Uint8Array(wav), {
    headers: { 'Content-Type': 'audio/wav' },
  });
}

// Gemini TTS returns raw 16-bit mono PCM at 24kHz — wrap it in a WAV header
function pcmToWav(pcmBase64: string, sampleRate = 24000): Buffer {
  const pcm = Buffer.from(pcmBase64, 'base64');
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(pcm.length + 36, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);       // PCM chunk size
  header.writeUInt16LE(1, 20);        // format: PCM
  header.writeUInt16LE(1, 22);        // channels: mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28); // byte rate
  header.writeUInt16LE(2, 32);        // block align
  header.writeUInt16LE(16, 34);       // bits per sample
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);

  return Buffer.concat([header, pcm]);
}
