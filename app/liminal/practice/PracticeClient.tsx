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
  const paraBuffer = useRef('');
  const audioQueue = useRef<Promise<string | null>[]>([]);
  const draining = useRef(false);
  const phaseTextRef = useRef(''); // stable ref for playAgain

  useEffect(() => () => {
    shouldStop.current = true;
    currentAudio.current?.pause();
  }, []);

  function ttsRequest(t: string): Promise<string | null> {
    return fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: t.trim() }),
    })
      .then(r => r.ok ? r.blob().then(b => URL.createObjectURL(b)) : null)
      .catch(() => null);
  }

  function enqueue(t: string) {
    if (t.trim().length < 30) return;
    audioQueue.current.push(ttsRequest(t));
    if (!draining.current) drain();
  }

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

  async function playAgain() {
    shouldStop.current = false;
    setAudioState('loading');
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: phaseTextRef.current }),
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

  const streamPhase = useCallback(async (p: Phase) => {
    if (activePhaseRef.current === p) return;
    activePhaseRef.current = p;
    setText('');
    phaseTextRef.current = '';
    paraBuffer.current = '';
    audioQueue.current = [];
    draining.current = false;
    shouldStop.current = false;
    setAudioState('idle');
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
        const chunk = decoder.decode(value, { stream: true });
        full += chunk;
        paraBuffer.current += chunk;
        setText(full);

        const parts = paraBuffer.current.split('\n\n');
        if (parts.length > 1) {
          for (let i = 0; i < parts.length - 1; i++) enqueue(parts[i]);
          paraBuffer.current = parts[parts.length - 1];
        }
      }

      if (paraBuffer.current.trim()) {
        enqueue(paraBuffer.current);
        paraBuffer.current = '';
      }

      phaseTextRef.current = full;
    } catch {
      setText('Something went quiet. Please go back and try again.');
    } finally {
      setStreaming(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  useEffect(() => {
    setElapsed(0);
    if (phase === 'complete' || phase === 'intention') return;
    const id = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  function advance() {
    stopPlayback();
    const idx = PHASE_ORDER.indexOf(phase as typeof PHASE_ORDER[number]);
    activePhaseRef.current = null;
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

        {label && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-stone uppercase tracking-widest">{label}</p>
            <div className="flex items-center gap-3">
              {text && (
                <>
                  {audioState === 'loading' && (
                    <span className="text-xs text-stone/40 animate-pulse">preparing...</span>
                  )}
                  {audioState === 'playing' && (
                    <button onClick={stopPlayback} className="text-xs text-stone/60 hover:text-stone transition-colors duration-200 uppercase tracking-widest">
                      stop
                    </button>
                  )}
                  {(audioState === 'done') && (
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
                    <span className="text-xs text-stone/40">unavailable</span>
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
