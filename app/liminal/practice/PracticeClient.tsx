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
  const shouldStop = useRef(false);
  const phaseTextRef = useRef('');
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => () => {
    shouldStop.current = true;
    try { sourceRef.current?.stop(); } catch {}
    audioCtxRef.current?.close();
  }, []);

  // Auto-play when streaming completes
  useEffect(() => {
    if (!streaming && text && phase !== 'intention' && phase !== 'complete') {
      playByParagraph(phaseTextRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streaming]);

  function getAudioCtx(): AudioContext {
    if (!audioCtxRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Ctx = window.AudioContext ?? (window as any).webkitAudioContext;
      audioCtxRef.current = new Ctx();
    }
    return audioCtxRef.current;
  }

  async function resumeCtx(ctx: AudioContext) {
    if (ctx.state === 'running') return true;
    try {
      await ctx.resume();
      // Safari may need a tick after resume
      if (ctx.state !== 'running') await new Promise(r => setTimeout(r, 80));
    } catch {}
    return ctx.state === 'running';
  }

  async function playByParagraph(fullText: string) {
    shouldStop.current = false;
    setAudioState('loading');

    const ctx = getAudioCtx();
    const running = await resumeCtx(ctx);

    // iOS/Safari blocks auto-play — fall back to the listen button
    if (!running) {
      setAudioState('idle');
      return;
    }

    const paragraphs = fullText.split(/\n+/).map(p => p.trim()).filter(p => p.length > 5);

    for (const para of paragraphs) {
      if (shouldStop.current) break;
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: para }),
        });
        if (!res.ok || shouldStop.current) continue;

        const arrayBuffer = await res.arrayBuffer();
        if (shouldStop.current) continue;

        // Use callback form — Safari's promise-based decodeAudioData is unreliable
        let audioBuf: AudioBuffer;
        try {
          audioBuf = await new Promise<AudioBuffer>((resolve, reject) =>
            ctx.decodeAudioData(arrayBuffer, resolve, reject)
          );
        } catch {
          continue;
        }
        if (shouldStop.current) continue;

        // iOS may have suspended the context during the fetch — re-resume
        if (ctx.state !== 'running') {
          const ok = await resumeCtx(ctx);
          if (!ok || shouldStop.current) continue;
        }

        setAudioState('playing');

        await new Promise<void>(resolve => {
          const source = ctx.createBufferSource();
          sourceRef.current = source;
          source.buffer = audioBuf;
          source.connect(ctx.destination);
          source.onended = () => resolve();
          source.start();
        });

        sourceRef.current = null;
      } catch {
        continue;
      }
    }

    if (!shouldStop.current) setAudioState('done');
  }

  function stopPlayback() {
    shouldStop.current = true;
    try { sourceRef.current?.stop(); } catch {}
    sourceRef.current = null;
    setAudioState('idle');
  }

  const streamPhase = useCallback(async (p: Phase) => {
    if (activePhaseRef.current === p) return;
    activePhaseRef.current = p;
    setText('');
    phaseTextRef.current = '';
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
        setText(full);
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
                  {audioState === 'done' && (
                    <button onClick={() => playByParagraph(phaseTextRef.current)} className="text-xs text-stone/50 hover:text-stone transition-colors duration-200">
                      again
                    </button>
                  )}
                  {audioState === 'idle' && !streaming && (
                    <button onClick={() => playByParagraph(phaseTextRef.current)} className="text-xs text-stone/50 hover:text-stone transition-colors duration-200">
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
              <p className="text-xs text-stone/40 pt-2">
                Keep the voice going —{' '}
                <a href="mailto:garnet.lyndon@gmail.com" className="underline underline-offset-4 hover:text-stone transition-colors duration-200">
                  donate
                </a>
              </p>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
