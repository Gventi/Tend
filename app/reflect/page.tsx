'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ReflectPage() {
  const router = useRouter();
  const [reflectionPrompt, setReflectionPrompt] = useState('');
  const [freewrite, setFreewrite] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const sessionContent = sessionStorage.getItem('tend_session') ?? '';

    fetch('/api/reflect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionContent }),
    })
      .then((res) => res.json())
      .then((data) => {
        setReflectionPrompt(data.prompt ?? '');
        setLoading(false);
      })
      .catch(() => {
        setError('Something went quiet. Please go back and try again.');
        setLoading(false);
      });
  }, []);

  if (error) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm space-y-6 text-center">
          <p className="text-stone text-sm">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="text-sm text-stone underline underline-offset-4 hover:text-ink transition-colors duration-200"
          >
            Begin again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-16 animate-fade-in">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-6">
          {loading ? (
            <p className="text-stone text-sm animate-pulse">
              gathering a question...
            </p>
          ) : (
            <p className="text-ink text-base font-light leading-relaxed animate-fade-in">
              {reflectionPrompt}
            </p>
          )}
        </div>

        {!loading && (
          <textarea
            value={freewrite}
            onChange={(e) => setFreewrite(e.target.value)}
            rows={10}
            placeholder="Write whatever comes..."
            className="w-full bg-transparent border-b border-stone/20 focus:border-stone/40 px-0 py-3 text-sm text-ink placeholder:text-stone/40 resize-none outline-none transition-colors duration-200 leading-relaxed animate-fade-in"
          />
        )}

        {!loading && (
          <div className="pt-4 animate-fade-in">
            <button
              onClick={() => router.push('/')}
              className="text-xs text-stone/60 hover:text-stone transition-colors duration-200 tracking-wide uppercase"
            >
              Begin again
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
