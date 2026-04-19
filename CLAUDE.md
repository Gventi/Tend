# Tend

A loving-kindness (metta) meditation app. The core loop: check in with who you're bringing to mind and what's present, receive a personalized guided session, then sit with a reflection prompt.

## Stack

- Next.js 14.2 (App Router)
- TypeScript 5
- Tailwind CSS 3 (custom palette in `tailwind.config.ts`)
- `@google/generative-ai` 0.24 — Gemini 2.0 Flash

## App Flow

```
/ (check-in) → /session (streaming guided session) → /reflect (freewrite)
```

Data passing:
- Check-in → Session: URL query params `?target=&presence=`
- Session → Reflect: `sessionStorage` key `tend_session`

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Gemini API key — never expose to the client |

## Architecture Rules

1. **All Gemini prompts and model config must live in `lib/prompts.ts`.** Never inline prompt strings or model names in route handler files. Import from `lib/prompts.ts`.

2. API routes always export `export const runtime = 'nodejs'` — the `@google/generative-ai` SDK is not compatible with the Edge runtime.

3. Session text is streamed: `ReadableStream` in the route handler, consumed with `response.body.getReader()` on the client. Use `TextDecoder` with `{ stream: true }` to handle multi-byte UTF-8 at chunk boundaries.

4. No UI component library — all styling is Tailwind utility classes.

5. Server/client split for pages that read `searchParams`: thin Server Component page passes props to a `'use client'` component.

## Design System

Colors (defined in `tailwind.config.ts`):

| Token | Hex | Use |
|---|---|---|
| `parchment` | `#FAF9F6` | Page background |
| `linen` | `#F5F0E8` | Input/card backgrounds |
| `sage` | `#8A9E8A` | Interactive accent, borders |
| `stone` | `#9C8E84` | Secondary/muted text |
| `ink` | `#3D3530` | Primary text |

Aesthetic: quiet room, not wellness startup. Typography-forward, generous whitespace. No gradients. Subtle `fade-in` animation only.
