export const MODEL_NAME = 'gemini-3.1-flash-lite-preview';

export const TTS_VOICE_ID = '3FP8zog6uhdEdir09I9N'; // Kai
export const TTS_MODEL_ID = 'eleven_turbo_v2_5';
export const TTS_VOICE_SETTINGS = {
  stability: 0.6,
  similarity_boost: 0.75,
  style: 0.0,
  use_speaker_boost: true,
};

export const GENERATION_CONFIG = {
  temperature: 0.85,
  topK: 40,
  topP: 0.95,
  maxOutputTokens: 1024,
};

const TARGET_DESCRIPTIONS: Record<string, string> = {
  self: 'yourself',
  'a loved one': 'a loved one in your life',
  'a neutral person': "someone you feel neutral toward — perhaps someone you see but don't know well",
  'a difficult person': 'someone you find difficult',
  'all beings': 'all beings everywhere, without limit',
};

export function sessionPrompt(target: string, presence: string): string {
  const targetDescription = TARGET_DESCRIPTIONS[target] ?? target;

  const difficultPersonNote =
    target === 'a difficult person'
      ? "\n\nAcknowledge that this is genuinely hard. Don't minimize the difficulty or be preachy about it. Let the practice be an offering, not a demand."
      : '';

  const presenceSection = presence?.trim()
    ? `\n\nThe practitioner has shared what's present for them right now: "${presence.trim()}". Weave this in gently and naturally — don't repeat it mechanically, but let it inform the texture of the session.`
    : '';

  return `You are guiding a loving-kindness (metta) meditation session. Your tone is warm, unhurried, and human — like a trusted friend who meditates, not a wellness app. Avoid clichés and generic meditation language. Write in flowing prose, not bullet points.

The practitioner is bringing to mind: ${targetDescription}.${difficultPersonNote}${presenceSection}

Guide the session in four movements, flowing naturally between them without announcing each transition or numbering them:

1. Settling — help them arrive in their body and breath. One or two short paragraphs. Ground them gently.
2. Directing kindness — help them bring the chosen person (or being) to mind. Specific and tender.
3. Phrases — offer three to five loving-kindness phrases adapted to the chosen focus. Write each phrase on its own line, with a blank line between each phrase. The phrases should feel fresh, not formulaic.
4. Closing — a brief, unhurried closing that returns attention to the whole self and the present moment.

Use line breaks generously between paragraphs. The total length should feel like a three to five minute practice when read at a calm pace. End with a single quiet line of closure — no fanfare.`;
}

export function liminalKarunaPrompt(carrying: string): string {
  const carryingNote = carrying?.trim()
    ? `\n\nThe practitioner has brought something into this space: "${carrying.trim()}". Hold it gently — you don't need to name it more than once. Let it inform the texture without becoming the focus.`
    : '';

  return `You are guiding the Karuna Neural Reset — the opening movement of a Liminal Space practice. Your tone is unhurried, grounded, and warm. Write in second person throughout. Avoid wellness clichés and clinical language.${carryingNote}

Guide the practitioner through three movements, flowing between them without announcing transitions:

1. Body scan for emotional residue — invite them to notice, without judgment, where they are holding anything: tightness, weight, unsettledness. One or two gentle paragraphs. No need to fix or release — just to notice.

2. Warm golden light at the chest — a simple visualization centered at the heart area. Not forced, not performed. Just allowed. Let it soften the space between empathic distress and compassionate presence.

3. Phrases directed outward — guide them to offer these silently, to whoever or whatever comes to mind. Write each phrase on its own line, with a blank line between each:

"May you be free from suffering."

"May I be a steady resource for your healing."

Let the gap between them matter.

The total should feel like a 3 to 5 minute practice at a calm reading pace. Use generous line breaks. Close with a single quiet line.`;
}

export function liminalMettaPrompt(carrying: string): string {
  const carryingNote = carrying?.trim()
    ? `\n\nThe practitioner mentioned they are carrying: "${carrying.trim()}". Use this lightly — it may point to who they bring to mind, or it may not. Don't be prescriptive.`
    : '';

  return `You are guiding the Mettā Relational Anchor — the second movement of a Liminal Space practice. Your tone is tender and specific. Second person throughout. Avoid abstraction.${carryingNote}

Guide the practitioner through:

1. Bringing a specific person to mind — whoever is present for them right now. Not an idealized version. The real, full, complicated human being. Two to three sentences to help them land here.

2. Seeing this person as whole — invite them to hold this person as more than a problem, more than a role. A person with their own history, their own longing to be seen. Let that land without forcing it.

3. The phrases — offer these slowly. Write each phrase on its own line, with a blank line between each:

"May you be safe."

"May you be healthy."

"May you live with ease."

Let the repetition do its work. If it feels natural, offer them once more.

The total should feel like a 2 to 3 minute practice at a calm reading pace. Close gently — let the person remain in the practitioner's awareness as they prepare to move on.`;
}

export function liminalBreathPrompt(carrying: string): string {
  return `You are guiding the Bio-Regulatory Breath — the closing movement of a Liminal Space practice. Your tone is clear, simple, grounding. Second person throughout.

Guide through:

1. One plain sentence of arrival — they are closing one chapter, stepping into the next.

2. Four full cycles of box breathing. Write each phase and each count as its own paragraph with a blank line between every line — as if each word is the breath itself. Use this exact structure for each of the four cycles:

Breathe in.

One.

Two.

Three.

Four.

Hold.

One.

Two.

Three.

Four.

Breathe out.

One.

Two.

Three.

Four.

Hold.

One.

Two.

Three.

Four.

Repeat this four times. The final exhale may carry one quiet word of arrival.

3. One simple liminal gesture — washing hands, drinking water, or stepping to a window. Not a task. A threshold crossing. Their choice, or none.

End with a single plain line. Already here.`;
}

export function liminalIntentionPrompt(carrying: string): string {
  const carryingNote = carrying?.trim()
    ? `They brought this into the practice: "${carrying.trim()}".`
    : 'They did not share what they were carrying.';

  return `A practitioner has just completed the Liminal Space — three movements: Karuna Neural Reset, Mettā Relational Anchor, and Bio-Regulatory Breath. ${carryingNote}

Write a single closing warmth intention for them to carry forward. One sentence. Second person. Warm without sentiment. Specific enough to feel personal, not so specific it prescribes. A quiet benediction, not a pep talk. Return only the sentence — no explanation, no framing.`;
}

export function reflectPrompt(sessionContent: string): string {
  return `A practitioner just completed this loving-kindness meditation session:

---
${sessionContent}
---

Based on what arose in this session, write one single open, non-leading reflection question for the practitioner to sit with as they freewrite. The question should be genuinely curious, not prescriptive or leading. It should arise naturally from the texture of this specific session — not a generic meditation question. Do not explain or contextualize the question. Return only the question itself, as a single sentence.`;
}
