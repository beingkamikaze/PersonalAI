import { useId, type ReactNode } from "react";

export type InfoFeatureTone = "mint" | "purple" | "amber";

export type InfoFeatureItem = {
  title: string;
  description: string;
  icon: ReactNode;
  tone: InfoFeatureTone;
};

const TONE_CLASS: Record<InfoFeatureTone, string> = {
  mint: "bg-[var(--tone-mint)] text-accent",
  purple: "bg-[var(--tone-purple)] text-[var(--tone-purple-ink)]",
  amber: "bg-[#fff7e6] text-[var(--tone-amber)]",
};

/**
 * Quiet explanation band. Informational only — no click target, link, or chevron.
 */
export function InfoFeatureStrip({
  label,
  items,
  className = "",
}: {
  label: string;
  items: InfoFeatureItem[];
  className?: string;
}) {
  const labelId = useId();

  return (
    <section
      aria-labelledby={labelId}
      className={`rounded-2xl border border-border bg-[#f7faf8] px-4 py-3 sm:px-5 sm:py-3.5 ${className}`}
    >
      <h2
        id={labelId}
        className="text-[11px] font-medium tracking-[0.16em] text-muted uppercase"
      >
        {label}
      </h2>
      <ul className="mt-3 grid grid-cols-1 gap-3.5 md:grid-cols-2 md:gap-x-6 md:gap-y-3.5 lg:grid-cols-3 lg:gap-x-8">
        {items.map((item) => (
          <li key={item.title} className="flex min-w-0 items-start gap-2.5">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${TONE_CLASS[item.tone]}`}
              aria-hidden
            >
              {item.icon}
            </span>
            <span className="min-w-0 pt-0.5">
              <span className="block text-sm font-medium leading-tight text-fg">
                {item.title}
              </span>
              <span className="mt-1 block text-xs leading-snug text-muted">
                {item.description}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
