function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function UserAvatar({
  name,
  src,
  size = "sm",
}: {
  name: string;
  src?: string | null;
  size?: "sm" | "md";
}) {
  const dim = size === "md" ? "h-12 w-12 text-sm" : "h-9 w-9 text-xs";
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- remote OAuth / profile URLs, no next/image domain list
      <img
        src={src}
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
