import { resolveMediaUrl } from "@/lib/media";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

const sizeClass = {
  sm: "h-9 w-9 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-16 w-16 text-base",
} as const;

export function UserAvatar({
  name,
  src,
  size = "sm",
}: {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const dim = sizeClass[size];
  const resolved = resolveMediaUrl(src);
  if (resolved) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- remote OAuth / API URLs, no next/image domain list
      <img
        src={resolved}
        alt=""
        className={`${dim} shrink-0 rounded-full object-cover`}
      />
    );
  }
  return (
    <div
      aria-hidden
      className={`flex ${dim} shrink-0 items-center justify-center rounded-full bg-[var(--atmosphere-2)] font-medium text-fg`}
    >
      {initials(name)}
    </div>
  );
}
