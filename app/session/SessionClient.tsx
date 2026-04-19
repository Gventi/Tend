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
  const hasAutoPlayed = useRef(false);

  // Cancel audio when navigating away
  useEffect(() => () => {
    shouldStop.current = true;
    currentAudio.current?.pause();
  }, []);

  // Auto-play once streaming completes
  useEffect(() => {
    if (!streaming && sessionText && !hasAutoPlayed.current) {
      hasAutoPlayed.current = true;
      playSession();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streaming]);

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

        if (!response.ok || !response.body) throw new Error('Session request failed');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;
          setSessionText(fullText);
        }

        sessionStorage.setItem('tend_session', fullText);
        setStreaming(false);
      } catch (err) {
        setError('Something went quiet. Please go back and try again.');
        setStreaming(false);
        console.error(err);
      }
    }

    runSession();
  }, [target, presence]);

  async function playSession() {
    shouldStop.current = false;
    setAudioState('loading');

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: sessionText }),
      });

      if (!res.ok) { setAudioState('error'); return; }

      const blob = await res.blob();
      if (shouldStop.current) return;

      const url = URL.createObjectURL(blob);
      setAudioState('playing');

      await new Promise<void>((resolve) => {
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

  function stopPlayback() {
    shouldStop.current = true;
    currentAudio.current?.pause();
    currentAudio.current = null;
    setAudioState('idle');
  }

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

        {/* Top bar — listen control, shown once streaming is done */}
        {!streaming && sessionText && (
          <div className="flex justify-end animate-fade-in">
            {audioState === 'idle' && (
              <button onClick={playSession} className="text-xs text-stone/60 hover:text-stone transition-colors duration-200">
                listen
              </button>
            )}
            {audioState === 'loading' && (
              <span className="text-xs text-stone/40 animate-pulse">preparing...</span>
            )}
            {audioState === 'playing' && (
              <button onClick={stopPlayback} className="text-xs text-stone/60 hover:text-stone transition-colors duration-200 uppercase tracking-widest">
                stop
              </button>
            )}
            {audioState === 'done' && (
              <button onClick={playSession} className="text-xs text-stone/50 hover:text-stone transition-colors duration-200">
                again
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
