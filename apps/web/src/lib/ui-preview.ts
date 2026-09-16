import type {
  AiProfile,
  ChatMessage,
  InterviewState,
  KnowledgeDocument,
  Personality,
} from "@/lib/api";
import { isUiPreview } from "@/lib/env";

export { isUiPreview };

const now = "2026-09-15T10:00:00.000Z";

export const PREVIEW_PROFILE: AiProfile = {
  id: "preview-profile",
  user_id: "preview-user",
  name: "Mayank Sharma",
  username: "mayank",
  headline: "Software engineer building personal AI products",
  bio: "I help teams ship calm, credible product UI.",
  avatar_url: null,
  visibility: "draft",
  contact_email: "mayank@example.com",
  calendar_link: "https://cal.com/mayank",
  completeness_score: 62,
  created_at: now,
  updated_at: now,
};

export const PREVIEW_INTERVIEW: InterviewState = {
  session_id: "preview-session",
  status: "in_progress",
  current_index: 0,
  total_questions: 10,
  question: "Full name + what should people call you?",
  completed: false,
};

export const PREVIEW_PERSONALITY: Personality = {
  ai_profile_id: PREVIEW_PROFILE.id,
  communication_style: "Clear, warm, concise",
  formality: "Professional but not stiff",
  humor: "Light, never sarcastic",
  verbosity: "Short answers first, detail on request",
  directness: "Direct",
  languages: ["en"],
  traits: ["calm", "precise"],
  preferences_json: {},
  values_json: {},
  boundaries_json: {},
  facts: [
    { key: "role", value: "Software engineer" },
    { key: "open_to", value: "Product and AI work" },
  ],
};

export const PREVIEW_DOCS: KnowledgeDocument[] = [
  {
    id: "doc-ready",
    ai_profile_id: PREVIEW_PROFILE.id,
    filename: "Mayank_Sharma_Resume.pdf",
    file_url: null,
    mime_type: "application/pdf",
    source_type: "upload",
    source_url: null,
    status: "ready",
    error_message: null,
    created_at: now,
    updated_at: now,
  },
  {
    id: "doc-processing",
    ai_profile_id: PREVIEW_PROFILE.id,
    filename: "notes.txt",
    file_url: null,
    mime_type: "text/plain",
    source_type: "notes",
    source_url: null,
    status: "processing",
    error_message: null,
    created_at: now,
    updated_at: now,
  },
  {
    id: "doc-failed",
    ai_profile_id: PREVIEW_PROFILE.id,
    filename: "old-site",
    file_url: null,
    mime_type: null,
    source_type: "url",
    source_url: "https://example.com",
    status: "failed",
    error_message: "Could not fetch URL",
    created_at: now,
    updated_at: now,
  },
];

export const PREVIEW_MESSAGES: ChatMessage[] = [
  {
    id: "m1",
    role: "user",
    content: "What does Mayank do?",
    created_at: now,
  },
  {
    id: "m2",
    role: "assistant",
    content:
      "Mayank is a software engineer who builds personal AI products. He focuses on clear product UI and shipping the core loop first.",
    created_at: now,
  },
];

export type PreviewMemory = {
  id: string;
  content: string;
  source: string;
  when: string;
};

export const PREVIEW_MEMORIES: PreviewMemory[] = [
  {
    id: "mem-1",
    content: "Prefers async updates over meetings.",
    source: "Private chat",
    when: "2 days ago",
  },
  {
    id: "mem-2",
    content: "Open to product and AI work, not recruiting spam.",
    source: "Interview",
    when: "Last week",
  },
  {
    id: "mem-3",
    content: "Never invent compensation, personal numbers, or internal docs.",
    source: "Private chat",
    when: "Last week",
  },
];

export type PreviewThread = {
  id: string;
  preview: string;
  when: string;
  messages: number;
  lines: { role: "visitor" | "ai"; content: string }[];
};

export const PREVIEW_THREADS: PreviewThread[] = [
  {
    id: "th-1",
    preview: "What kind of work is Mayank open to?",
    when: "Today",
    messages: 4,
    lines: [
      { role: "visitor", content: "What kind of work is Mayank open to?" },
      {
        role: "ai",
        content: "Product and AI work. Not a fit for recruiting spam.",
      },
    ],
  },
  {
    id: "th-2",
    preview: "How do they prefer to communicate?",
    when: "Yesterday",
    messages: 2,
    lines: [
      { role: "visitor", content: "How do they prefer to communicate?" },
      {
        role: "ai",
        content: "Async first. Short written updates. Calls for decisions.",
      },
    ],
  },
];
