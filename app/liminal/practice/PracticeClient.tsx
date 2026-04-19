'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type Phase = 'karuna' | 'metta' | 'breath' | 'intention' | 'complete';
type AudioState = 'idle' | 'loading' | 'playing' | 'done' | 'error';

const PHASE_ORDER: Phase[] = ['karuna', 'metta', 'breath'];

const PHASE_LABELS: Partial<Record<Phase, string>> = {
  karuna: 'karuna neural reset',
  metta: 'mettā relational anchor',
  breath: 'bio-regulatory breath',
};

const CONTINUE_LABEL: Partial<Record<Phase, string>> = {
  karuna: 'continue',
  metta: 'continue',
  breath: 'close the space',
};

function formatElapsed(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface PracticeClientProps {
  carrying: string;
}

export function PracticeClient({ carrying }: PracticeClientProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('karuna');
  const [text, setText] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [intention, setIntention] = useState('');
  const [audioState, setAudioState] = useState<AudioState>('idle');

  const activePhaseRef = useRef<Phase | null>(null);
  const currentAudio = useRef<HTMLAudioElement | null>(null);
  const shouldStop = useRef(false);

  // Cancel audio when leaving
  useEffect(() => () => {
    shouldStop.current = true;
    currentAudio.current?.pause();
  }, []);

  const streamPhase = useCallback(async (p: Phase) => {
    if (activePhaseRef.current === p) return;
    activePhaseRef.current = p;
    setText('');
    setStreaming(true);

    try {
      const res = await fetch('/api/liminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ component: p, carrying }),
      });

      if (!res.ok || !res.body) throw new Error();

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setText(full);
      }
    } catch {
      setText('Something went quiet. Please go back and try again.');
    } finally {
      setStreaming(false);
    }
  }, [carrying]);

  const fetchIntention = useCallback(async () => {
    setStreaming(true);
    try {
      const res = await fetch('/api/liminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ component: 'intention', carrying }),
      });
      const data = await res.json();
      setIntention(data.text ?? '');
    } catch {
      // proceed to complete without intention
    } finally {
      setStreaming(false);
      setPhase('complete');
    }
  }, [carrying]);

  useEffect(() => {
    if (phase === 'complete') return;
    if (phase === 'intention') { fetchIntention(); return; }
    streamPhase(phase);
  }, [phase, streamPhase, fetchIntention]);

  // Auto-play once each component finishes streaming
  useEffect(() => {
    if (!streaming && text && phase !== 'intention' && phase !== 'complete') {
      playCurrentPhase();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streaming]);

  useEffect(() => {
    setElapsed(0);
    if (phase === 'complete' || phase === 'intention') return;
    const id = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  async function playCurrentPhase() {
    shouldStop.current = false;
    setAudioState('loading');

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
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

  function advance() {
    stopPlayback();
    const idx = PHASE_ORDER.indexOf(phase as typeof PHASE_ORDER[number]);
    activePhaseRef.current = null;
    setAudioState('idle');
    if (idx >= 0 && idx < PHASE_ORDER.length - 1) {
      setPhase(PHASE_ORDER[idx + 1]);
    } else {
      setPhase('intention');
    }
  }

  const label = PHASE_LABELS[phase];
  const showControls = !streaming && text && phase !== 'intention' && phase !== 'complete';

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-16 animate-fade-in">
      <div className="w-full max-w-sm space-y-8">

        {/* Phase header + listen */}
        {label && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-stone uppercase tracking-widest">{label}</p>
            <div className="flex items-center gap-3">
              {!streaming && text && (
                <>
                  {audioState === 'idle' && (
                    <button onClick={playCurrentPhase} className="text-xs text-stone/60 hover:text-stone transition-colors duration-200">
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
                  {(audioState === 'done' || audioState === 'error') && (
                    <button onClick={playCurrentPhase} className="text-xs text-stone/50 hover:text-stone transition-colors duration-200">
                      {audioState === 'error' ? 'unavailable' : 'again'}
                    </button>
                  )}
                </>
              )}
              <p className="text-xs text-stone/40 tabular-nums">{formatElapsed(elapsed)}</p>
            </div>
          </div>
        )}

        {streaming && !text && phase !== 'intention' && (
          <p className="text-stone text-sm animate-pulse">arriving...</p>
        )}

        {phase === 'intention' && streaming && (
          <p className="text-stone text-sm animate-pulse">closing the space...</p>
        )}

        {text && phase !== 'complete' && (
          <p className="text-ink text-base leading-loose whitespace-pre-wrap font-light animate-fade-in">
            {text}
            {streaming && (
              <span className="inline-block w-1 h-4 ml-1 bg-stone/40 animate-pulse" />
            )}
          </p>
        )}

        {/* Continue */}
        {showControls && audioState !== 'loading' && audioState !== 'playing' && (
          <div className="pt-2 animate-fade-in">
            <button
              onClick={advance}
              className="text-sm text-stone hover:text-ink transition-colors duration-200"
            >
              {CONTINUE_LABEL[phase] ?? 'continue'}
            </button>
          </div>
        )}

        {/* Complete */}
        {phase === 'complete' && (
          <div className="space-y-10 animate-fade-in">
            {intention && (
              <p className="text-ink text-base font-light leading-relaxed">
                {intention}
              </p>
            )}
            <div className="space-y-3">
              <button
                onClick={() => router.push('/liminal')}
                className="block text-sm text-stone hover:text-ink transition-colors duration-200"
              >
                return to the threshold
              </button>
              <button
                onClick={() => router.push('/')}
                className="block text-xs text-stone/50 hover:text-stone transition-colors duration-200"
              >
                back to Tend
              </button>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
