import { getApiUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function getAccessToken(): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new ApiError(401, "Not signed in");
  }
  return data.session.access_token;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...(init.headers as Record<string, string> | undefined),
  };
  // Let the browser set multipart boundary when body is FormData
  if (!(init.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${getApiUrl()}${path}`, {
    ...init,
    headers,
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = (await res.json()) as {
        detail?: string | { msg?: string }[];
      };
      if (typeof body.detail === "string") {
        detail = body.detail;
      } else if (Array.isArray(body.detail)) {
        detail = body.detail.map((d) => d.msg ?? JSON.stringify(d)).join(", ");
      }
    } catch {
      // ignore parse errors
    }
    throw new ApiError(res.status, detail);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

/** Multipart upload helper — do not set Content-Type manually. */
export async function apiUpload<T>(
  path: string,
  file: File,
  fieldName = "file",
): Promise<T> {
  const form = new FormData();
  form.append(fieldName, file);
  return apiFetch<T>(path, { method: "POST", body: form });
}

export type AiProfile = {
  id: string;
  user_id: string;
  name: string;
  username: string | null;
  headline: string | null;
  bio: string | null;
  avatar_url: string | null;
  visibility: string;
  contact_email: string | null;
  calendar_link: string | null;
  completeness_score: number;
  created_at: string;
  updated_at: string;
};

export type InterviewState = {
  session_id: string;
  status: string;
  current_index: number;
  total_questions: number;
  question: string | null;
  completed: boolean;
  extracted?: boolean;
};

export type Personality = {
  ai_profile_id: string;
  communication_style: string | null;
  formality: string | null;
  humor: string | null;
  verbosity: string | null;
  directness: string | null;
  languages: unknown[];
  traits: unknown[];
  preferences_json: Record<string, unknown>;
  values_json: Record<string, unknown>;
  boundaries_json: Record<string, unknown>;
  facts: { key: string; value: string }[];
};

export type ChatMessage = {
  id: string;
  role: string;
  content: string;
  created_at: string;
};

export type ChatResult = {
  conversation_id: string;
  reply: string;
  messages: ChatMessage[];
};

/** Knowledge document (Phase 2) */
export type KnowledgeDocument = {
  id: string;
  ai_profile_id: string;
  filename: string;
  file_url: string | null;
  mime_type: string | null;
  source_type: string;
  source_url: string | null;
  status: "pending" | "processing" | "ready" | "failed" | string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};
