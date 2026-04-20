'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

interface SessionClientProps {
  target: string;
  presence: string;
}

type AudioState = 'idle' | 'loading' | 'playing' | 'done' | 'error';

export function SessionClient({ target, presence }: SessionClientProps) {
  const router = useRouter();
  const [sessionText, setSessionText] = useState('');
  const [streaming, setStreaming] = useState(true);
  const [error, setError] = useState('');
  const [audioState, setAudioState] = useState<AudioState>('idle');

  const hasStarted = useRef(false);
  const currentAudio = useRef<HTMLAudioElement | null>(null);
  const shouldStop = useRef(false);
  const paraBuffer = useRef('');
  const pendingParas = useRef<string[]>([]);
  const audioQueue = useRef<Promise<string | null>[]>([]);
  const draining = useRef(false);
  const inFlight = useRef(0);
  const MAX_IN_FLIGHT = 2;

  useEffect(() => () => {
    shouldStop.current = true;
    currentAudio.current?.pause();
  }, []);

  function ttsRequest(text: string): Promise<string | null> {
    inFlight.current++;
    return fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.trim() }),
    })
      .then(r => r.ok ? r.blob().then(b => URL.createObjectURL(b)) : null)
      .catch(() => null)
      .finally(() => { inFlight.current--; maybeFireNext(); });
  }

  function maybeFireNext() {
    while (inFlight.current < MAX_IN_FLIGHT && pendingParas.current.length > 0) {
      const next = pendingParas.current.shift()!;
      audioQueue.current.push(ttsRequest(next));
    }
  }

  function enqueue(text: string) {
    if (text.trim().length < 30) return;
    pendingParas.current.push(text.trim());
    maybeFireNext();
    if (!draining.current) drain();
  }

  // Play queued audio segments in order
  async function drain() {
    draining.current = true;
    setAudioState('loading');
    while (audioQueue.current.length > 0) {
      if (shouldStop.current) break;
      const url = await audioQueue.current.shift()!;
      if (!url || shouldStop.current) continue;
      setAudioState('playing');
      await new Promise<void>(resolve => {
        const audio = new Audio(url);
        currentAudio.current = audio;
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        audio.play().catch(() => resolve());
      });
      URL.revokeObjectURL(url);
      currentAudio.current = null;
    }
    draining.current = false;
    if (!shouldStop.current) setAudioState('done');
  }

  function stopPlayback() {
    shouldStop.current = true;
    currentAudio.current?.pause();
    currentAudio.current = null;
    audioQueue.current = [];
    draining.current = false;
    setAudioState('idle');
  }

  // "Again" sends the full text as one request — acceptable wait for a replay
  async function playAgain() {
    shouldStop.current = false;
    setAudioState('loading');
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: sessionText }),
      });
      if (!res.ok) { setAudioState('error'); return; }
      const url = URL.createObjectURL(await res.blob());
      if (shouldStop.current) return;
      setAudioState('playing');
      await new Promise<void>(resolve => {
        const audio = new Audio(url);
        currentAudio.current = audio;
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        audio.play().catch(() => resolve());
      });
      URL.revokeObjectURL(url);
      currentAudio.current = null;
      if (!shouldStop.current) setAudioState('done');
    } catch {
      setAudioState('error');
    }
  }

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    async function runSession() {
      try {
        const response = await fetch('/api/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target, presence }),
        });

        if (!response.ok || !response.body) throw new Error();

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let full = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          full += chunk;
          paraBuffer.current += chunk;
          setSessionText(full);

          // Fire TTS for each complete paragraph as it arrives
          const parts = paraBuffer.current.split('\n\n');
          if (parts.length > 1) {
            for (let i = 0; i < parts.length - 1; i++) enqueue(parts[i]);
            paraBuffer.current = parts[parts.length - 1];
          }
        }

        // Flush any remaining text
        if (paraBuffer.current.trim()) {
          enqueue(paraBuffer.current);
          paraBuffer.current = '';
        }

        sessionStorage.setItem('tend_session', full);
        setStreaming(false);
      } catch (err) {
        setError('Something went quiet. Please go back and try again.');
        setStreaming(false);
        console.error(err);
      }
    }

    runSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, presence]);

  if (error) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm space-y-6 text-center">
          <p className="text-stone text-sm">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="text-sm text-stone underline underline-offset-4 hover:text-ink transition-colors duration-200"
          >
            Go back
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-16 animate-fade-in">
      <div className="w-full max-w-sm space-y-10">

        {/* Audio control — top right */}
        {sessionText && (
          <div className="flex justify-end animate-fade-in">
            {audioState === 'loading' && (
              <span className="text-xs text-stone/40 animate-pulse">preparing...</span>
            )}
            {audioState === 'playing' && (
              <button onClick={stopPlayback} className="text-xs text-stone/60 hover:text-stone transition-colors duration-200 uppercase tracking-widest">
                stop
              </button>
            )}
            {audioState === 'done' && (
              <button onClick={playAgain} className="text-xs text-stone/50 hover:text-stone transition-colors duration-200">
                again
              </button>
            )}
            {audioState === 'idle' && !streaming && (
              <button onClick={playAgain} className="text-xs text-stone/50 hover:text-stone transition-colors duration-200">
                listen
              </button>
            )}
            {audioState === 'error' && (
              <span className="text-xs text-stone/40">voice unavailable</span>
            )}
          </div>
        )}

        {streaming && !sessionText && (
          <p className="text-stone text-sm animate-pulse">settling in...</p>
        )}

        {sessionText && (
          <p className="text-ink text-base leading-loose whitespace-pre-wrap font-light">
            {sessionText}
            {streaming && (
              <span className="inline-block w-1 h-4 ml-1 bg-stone/40 animate-pulse" />
            )}
          </p>
        )}

        {!streaming && sessionText && (
          <div className="pt-8 animate-fade-in">
            <button
              onClick={() => router.push('/reflect')}
              className="block text-sm text-stone hover:text-ink underline underline-offset-4 transition-colors duration-200"
            >
              Continue to reflection
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
