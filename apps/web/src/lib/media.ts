import { getApiUrl } from "@/lib/env";

/**
 * Avatar URLs may be absolute (Google OAuth, data/blob) or API-relative
 * (`/media/avatars/{id}`). Prefix relative paths with the FastAPI origin.
 */
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (
    /^https?:\/\//i.test(url) ||
    url.startsWith("data:") ||
    url.startsWith("blob:")
  ) {
    return url;
  }
  if (url.startsWith("/")) {
    return `${getApiUrl().replace(/\/$/, "")}${url}`;
  }
  return url;
}
