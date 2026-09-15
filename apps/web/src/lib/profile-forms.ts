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
