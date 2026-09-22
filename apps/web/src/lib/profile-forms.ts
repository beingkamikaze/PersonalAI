import type { AiProfile, Personality } from "@/lib/api";

export type ProfileDraft = {
  name: string;
  headline: string;
  bio: string;
};

export type PublicDraft = {
  username: string;
  contactEmail: string;
  calendarLink: string;
};

export type PersonalityDraft = {
  communication_style: string;
  formality: string;
  humor: string;
  verbosity: string;
  directness: string;
  traits: string;
};

/** Ordered key→value map for interview / Known facts on Profile. */
export type FactsDraft = Record<string, string>;

/**
 * Human labels for structured_fact keys from the interview extract.
 * Unknown keys fall back to a readable title-case of the snake_case key.
 */
const FACT_LABELS: Record<string, string> = {
  full_name: "Full name",
  preferred_name: "Preferred name",
  current_role: "Current role",
  focus_area: "Focus area",
  skills: "Skills",
  project_highlight: "Project highlight",
  typical_inbound_contacts: "Who usually reaches out",
  communication_preference: "Communication preference",
  open_to_roles: "Open to",
  misunderstandings: "Common misunderstandings",
  headline: "Headline",
};

export function factLabel(key: string): string {
  if (FACT_LABELS[key]) return FACT_LABELS[key];
  return key
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function factsDraftFrom(
  facts: { key: string; value: string }[],
): FactsDraft {
  const draft: FactsDraft = {};
  for (const f of facts) {
    if (!f.key) continue;
    draft[f.key] = f.value ?? "";
  }
  return draft;
}

export function profileDraftFrom(me: AiProfile): ProfileDraft {
  return {
    name: me.name,
    headline: me.headline ?? "",
    bio: me.bio ?? "",
  };
}

export function publicDraftFrom(me: AiProfile): PublicDraft {
  return {
    username: me.username ?? "",
    contactEmail: me.contact_email ?? "",
    calendarLink: me.calendar_link ?? "",
  };
}

export function personalityDraftFrom(p: Personality): PersonalityDraft {
  return {
    communication_style: p.communication_style ?? "",
    formality: p.formality ?? "",
    humor: p.humor ?? "",
    verbosity: p.verbosity ?? "",
    directness: p.directness ?? "",
    traits: (p.traits ?? []).map(String).join(", "),
  };
}

export function draftsEqual<T>(a: T, b: T): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
