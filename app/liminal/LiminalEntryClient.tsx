'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function LiminalEntryClient() {
  const router = useRouter();
  const [carrying, setCarrying] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/liminal/practice?carrying=${encodeURIComponent(carrying)}`);
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16 animate-fade-in">
      <div className="w-full max-w-sm space-y-12">
        <header className="space-y-3">
          <p className="text-xs text-stone uppercase tracking-widest">Tend</p>
          <h1 className="text-3xl font-light tracking-wide text-ink">
            The Liminal Space
          </h1>
          <p className="text-stone text-sm leading-relaxed">
            A 6–10 minute sequence of compassion reset, relational warmth, and breath.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-8">
          <fieldset className="space-y-2">
            <legend className="text-xs text-stone uppercase tracking-widest">
              Who or what are you carrying into this space?{' '}
              <span className="normal-case tracking-normal opacity-60">
                optional
              </span>
            </legend>
            <textarea
              value={carrying}
              onChange={(e) => setCarrying(e.target.value)}
              rows={3}
              placeholder="A person, a feeling, a situation..."
              className="w-full bg-linen/40 border border-transparent focus:border-sage/40 rounded-sm px-4 py-3 text-sm text-ink placeholder:text-stone/50 resize-none outline-none transition-colors duration-200"
            />
          </fieldset>

          <button
            type="submit"
            className="w-full py-3 bg-sage/15 hover:bg-sage/25 border border-sage/30 text-ink text-sm tracking-wide rounded-sm transition-colors duration-200"
          >
            Enter
          </button>
        </form>
      </div>
    </main>
  );
}
