/** Date/time helpers shared by dashboard cards. */

/** "Sep 15 · 2:14 PM" (adds the year when it is not the current one). */
export function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const sameYear = d.getFullYear() === new Date().getFullYear();
  const date = d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
  const time = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${date} · ${time}`;
}

/** "Sep 15" / "Sep 15, 2025" */
export function formatDay(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

export function truncate(text: string, max: number) {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

/** Owner's first name, e.g. "Mayank Sharma" → "Mayank". */
export function firstName(name: string | null | undefined) {
  if (!name) return null;
  const part = name.trim().split(/\s+/).filter(Boolean)[0];
  return part || null;
}

/** "Alex" → "Alex's AI"; "James" → "James' AI". */
export function possessiveAiName(name: string | null | undefined) {
  const first = firstName(name);
  if (!first) return "Your AI";
  return /s$/i.test(first) ? `${first}' AI` : `${first}'s AI`;
}

/** Count items whose ISO timestamp is within the last `days` days. */
export function countWithinDays(
  items: { created_at: string }[],
  days: number,
): number {
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  return items.filter((i) => {
    const t = new Date(i.created_at).getTime();
    return !Number.isNaN(t) && t >= since;
  }).length;
}

/** Newest ISO timestamp among items, or null. */
export function latestTimestamp(
  items: { created_at: string }[],
): string | null {
  let best: string | null = null;
  let bestT = -Infinity;
  for (const i of items) {
    const t = new Date(i.created_at).getTime();
    if (!Number.isNaN(t) && t > bestT) {
      bestT = t;
      best = i.created_at;
    }
  }
  return best;
}
