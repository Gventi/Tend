'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const TARGETS = [
  { value: 'self', label: 'yourself' },
  { value: 'a loved one', label: 'a loved one' },
  { value: 'a neutral person', label: 'a neutral person' },
  { value: 'a difficult person', label: 'a difficult person' },
  { value: 'all beings', label: 'all beings' },
];

export default function CheckInPage() {
  const router = useRouter();
  const [target, setTarget] = useState('self');
  const [presence, setPresence] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams({ target, presence });
    router.push(`/session?${params.toString()}`);
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16 animate-fade-in">
      <div className="w-full max-w-sm space-y-12">
        <header className="space-y-1">
          <h1 className="text-4xl font-light tracking-wide text-ink">Tend</h1>
          <p className="text-stone text-sm">a loving-kindness practice</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-8">
          <fieldset className="space-y-3">
            <legend className="text-xs text-stone uppercase tracking-widest">
              Who are you bringing to mind?
            </legend>
            <div className="space-y-2">
              {TARGETS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTarget(value)}
                  className={`w-full text-left px-4 py-3 rounded-sm border text-sm transition-colors duration-200 ${
                    target === value
                      ? 'border-sage bg-linen text-ink'
                      : 'border-transparent bg-linen/40 text-stone hover:border-sage/40 hover:text-ink'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-xs text-stone uppercase tracking-widest">
              What&apos;s present for you right now?{' '}
              <span className="normal-case tracking-normal opacity-60">
                optional
              </span>
            </legend>
            <textarea
              value={presence}
              onChange={(e) => setPresence(e.target.value)}
              rows={3}
              placeholder="Anything you'd like to bring with you..."
              className="w-full bg-linen/40 border border-transparent focus:border-sage/40 rounded-sm px-4 py-3 text-sm text-ink placeholder:text-stone/50 resize-none outline-none transition-colors duration-200"
            />
          </fieldset>

          <button
            type="submit"
            className="w-full py-3 bg-sage/15 hover:bg-sage/25 border border-sage/30 text-ink text-sm tracking-wide rounded-sm transition-colors duration-200"
          >
            Begin
          </button>

          <div className="flex items-center gap-3 pt-1">
            <div className="flex-1 h-px bg-stone/15" />
            <span className="text-xs text-stone/40">or</span>
            <div className="flex-1 h-px bg-stone/15" />
          </div>

          <Link
            href="/liminal"
            className="block w-full text-center py-3 text-sm text-stone hover:text-ink transition-colors duration-200"
          >
            The Liminal Space
            <span className="ml-2 text-xs text-stone/40">6–10 min</span>
          </Link>
        </form>
      </div>
    </main>
  );
}
