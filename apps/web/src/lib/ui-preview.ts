import type {
  AiProfile,
  AnalyticsSummary,
  ChatMessage,
  InterviewState,
  KnowledgeDocument,
  MemoryItem,
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
  visibility: "published",
  contact_email: "mayank@example.com",
  calendar_link: "https://cal.com/mayank",
  completeness_score: 100,
  created_at: now,
  updated_at: now,
};

/** Dashboard mock — matches reference numbers; used when API is down. */
export const PREVIEW_ANALYTICS: AnalyticsSummary = {
  visibility: "published",
  username: "mayank",
  completeness_score: 100,
  completeness_checklist: {
    profile_basics: true,
    interview_completed: true,
    personality: true,
    knowledge_ready: true,
    has_memory: true,
    username_set: true,
    published: true,
  },
  visits_today: 0,
  visits_7d: 11,
  conversations_7d: 3,
  messages_7d: 3,
  public_url_path: "/u/mayank",
  owner_chats_used_today: 1,
  owner_chats_limit: 40,
  owner_chats_remaining: 39,
  documents_used: 1,
  documents_limit: 8,
  documents_remaining: 7,
};

export type DashboardLoadResult = {
  profile: AiProfile;
  stats: AnalyticsSummary;
  /** true when live API data was used */
  fromApi: boolean;
  /** auth missing — caller may redirect unless UI preview */
  needsAuth?: boolean;
  /** no profile yet — caller may send to onboarding unless UI preview */
  needsOnboarding?: boolean;
};

/**
 * Prefer live API. If it is down / unreachable / unauthorized in preview,
 * keep the dashboard visible with mock data.
 */
export async function loadDashboardData(
  fetchProfile: () => Promise<AiProfile>,
  fetchStats: (id: string) => Promise<AnalyticsSummary>,
): Promise<DashboardLoadResult> {
  try {
    const profile = await fetchProfile();
    const stats = await fetchStats(profile.id);
    return { profile, stats, fromApi: true };
  } catch (err) {
    const status =
      err && typeof err === "object" && "status" in err
        ? Number((err as { status: number }).status)
        : 0;

    if (status === 401) {
      if (isUiPreview()) {
        return {
          profile: PREVIEW_PROFILE,
          stats: PREVIEW_ANALYTICS,
          fromApi: false,
        };
      }
      return {
        profile: PREVIEW_PROFILE,
        stats: PREVIEW_ANALYTICS,
        fromApi: false,
        needsAuth: true,
      };
    }

    if (status === 404) {
      if (isUiPreview()) {
        return {
          profile: PREVIEW_PROFILE,
          stats: PREVIEW_ANALYTICS,
          fromApi: false,
        };
      }
      return {
        profile: PREVIEW_PROFILE,
        stats: PREVIEW_ANALYTICS,
        fromApi: false,
        needsOnboarding: true,
      };
    }

    // Network / 5xx / API not running — keep UI showing
    return {
      profile: PREVIEW_PROFILE,
      stats: PREVIEW_ANALYTICS,
      fromApi: false,
    };
  }
}

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

/** Full MemoryItem[] for /app/memories mockup when API is down. */
export const PREVIEW_MEMORY_ITEMS: MemoryItem[] = [
  {
    id: "mem-item-1",
    ai_profile_id: PREVIEW_PROFILE.id,
    memory_type: "preference",
    content: "I prefer async Slack updates over meetings.",
    importance: 0.82,
    confidence: 0.9,
    source: "owner_chat",
    created_at: "2026-09-14T10:00:00.000Z",
    last_accessed: "2026-09-14T10:00:00.000Z",
  },
  {
    id: "mem-item-2",
    ai_profile_id: PREVIEW_PROFILE.id,
    memory_type: "boundary",
    content: "Never invent compensation, personal numbers, or internal docs.",
    importance: 0.95,
    confidence: 0.98,
    source: "owner_chat",
    created_at: "2026-09-10T10:00:00.000Z",
    last_accessed: "2026-09-10T10:00:00.000Z",
  },
  {
    id: "mem-item-3",
    ai_profile_id: PREVIEW_PROFILE.id,
    memory_type: "preference",
    content: "I prefer morning calls.",
    importance: 0.7,
    confidence: 0.85,
    source: "owner_chat",
    created_at: "2026-09-08T10:00:00.000Z",
    last_accessed: "2026-09-08T10:00:00.000Z",
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
