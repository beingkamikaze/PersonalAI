import type { PersonalityDraft } from "@/lib/profile-forms";

/** Fixed visitor line. The reply illustrates tone, not the owner's identity. */
export const PERSONALITY_SAMPLE_QUESTION = "Tell me what you do.";

type Manner = "unset" | "casual" | "formal" | "balanced" | "custom";
type Length = "unset" | "concise" | "detailed" | "on-request" | "balanced" | "custom";
type Humor = "unset" | "none" | "light" | "playful" | "custom";
type Directness = "unset" | "direct" | "gentle" | "custom";

export type PersonalitySample = {
  question: string;
  reply: string;
  /** Actual saved phrases, so the sample stays tied to real settings. */
  voice: string | null;
};

/**
 * A neutral tone sample from the current draft.
 * Stored values stay free text — keyword hints only choose the sample sentence.
 */
export function personalitySample(draft: PersonalityDraft): PersonalitySample {
  const voice = voiceLine(draft);
  if (!voice) {
    return {
      question: PERSONALITY_SAMPLE_QUESTION,
      reply:
        "Set a voice above and this sample will follow it. It shows tone only — not who you are.",
      voice: null,
    };
  }

  const manner = mannerFrom(draft.formality);
  const length = lengthFrom(draft.verbosity, draft.communication_style);
  const humor = humorFrom(draft.humor);
  const direct = directFrom(draft.directness);

  const reply = [
    opening(manner, direct),
    lengthSentence(length),
    humorSentence(humor),
  ]
    .filter(Boolean)
    .join(" ");

  return {
    question: PERSONALITY_SAMPLE_QUESTION,
    reply,
    voice,
  };
}

function voiceLine(draft: PersonalityDraft): string | null {
  const parts = [
    draft.communication_style,
    draft.formality,
    draft.humor,
    draft.verbosity,
    draft.directness,
    draft.traits,
  ]
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

function mannerFrom(formality: string): Manner {
  const value = formality.trim().toLowerCase();
  if (!value) return "unset";
  if (/not stiff|not formal|not too formal|balanced|neutral/.test(value)) {
    return "balanced";
  }
  if (/\bcasual\b|\binformal\b|\brelaxed\b|\bfriendly\b/.test(value)) {
    return "casual";
  }
  if (/\bformal\b|\bprofessional\b|\bpolite\b|\bstiff\b/.test(value)) {
    return "formal";
  }
  return "custom";
}

function lengthFrom(verbosity: string, style: string): Length {
  const value = (verbosity.trim() || style.trim()).toLowerCase();
  if (!value) return "unset";
  const short = /concise|short|brief|tight/.test(value);
  const detail = /detail|thorough|long|verbose|in-depth/.test(value);
  if (short && detail) return "on-request";
  if (/balanced|medium|moderate/.test(value)) return "balanced";
  if (short) return "concise";
  if (detail) return "detailed";
  return verbosity.trim() ? "custom" : "unset";
}

function humorFrom(humor: string): Humor {
  const value = humor.trim().toLowerCase();
  if (!value) return "unset";
  if (/\bplayful\b|\bwitty\b|\bfunny\b|\bjoke/.test(value)) return "playful";
  if (/\blight\b/.test(value)) return "light";
  if (
    /\bno humor\b|\bwithout humor\b|\bnone\b|\bserious\b|\bdry\b|\bnever\b/.test(
      value,
    )
  ) {
    return "none";
  }
  return "custom";
}

function directFrom(directness: string): Directness {
  const value = directness.trim().toLowerCase();
  if (!value) return "unset";
  if (/\bgentle\b|\bsoft\b|\bdiplomatic\b|\bindirect\b|\bsubtle\b/.test(value)) {
    return "gentle";
  }
  if (/\bdirect\b|\bblunt\b|\bstraight\b|\bcandid\b|\bto the point\b/.test(value)) {
    return "direct";
  }
  return "custom";
}

function opening(manner: Manner, direct: Directness): string {
  const warm = manner === "casual";
  const formal = manner === "formal";
  if (direct === "direct") {
    if (warm) return "I'll say what I do first.";
    if (formal) return "I will begin with the work itself.";
    return "I lead with the work itself.";
  }
  if (direct === "gentle") {
    if (warm) return "I can ease into what I do.";
    if (formal) return "I would be glad to walk through the work.";
    return "I can walk through what I do.";
  }
  if (warm) return "Happy to share what I do.";
  if (formal) return "I would be glad to describe the work.";
  return "I can describe the work.";
}

function lengthSentence(length: Length): string {
  if (length === "concise") return "I'll keep it to a few sentences.";
  if (length === "detailed") return "I'll add the context someone would need.";
  if (length === "on-request") {
    return "I'll start short, then add detail if you need it.";
  }
  return "I'll stay only as long as the question needs.";
}

function humorSentence(humor: Humor): string {
  if (humor === "light") return "A light touch is welcome.";
  if (humor === "playful") return "Expect a little play in the wording.";
  if (humor === "none") return "I'll skip the jokes.";
  return "";
}
