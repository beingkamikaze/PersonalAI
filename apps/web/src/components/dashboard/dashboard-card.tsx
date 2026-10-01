import Link from "next/link";
import { type ReactNode } from "react";
import { ChevronRightIcon } from "@/components/ui/icons";

export const DASHBOARD_CARD_CLASS =
  "relative flex flex-col rounded-[22px] border border-border bg-white shadow-[0_16px_40px_-28px_rgba(18,40,32,0.28)]";

/**
 * Card shell shared by every dashboard section: serif title, muted subtitle,
 * optional trailing action (usually "View all").
 */
export function DashboardCard({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: { href: string; label: string } | ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`${DASHBOARD_CARD_CLASS} p-5 sm:p-6 ${className}`}>
      <div className="flex shrink-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-[1.3rem] leading-tight tracking-[-0.01em] text-fg sm:text-[1.4rem]">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-1 text-sm text-muted">{subtitle}</p>
          ) : null}
        </div>
        {isLinkAction(action) ? (
          <Link
            href={action.href}
            className="inline-flex shrink-0 items-center gap-0.5 pt-1 text-[13px] font-medium text-accent hover:text-accent-hover"
          >
            {action.label}
            <ChevronRightIcon className="h-3.5 w-3.5" />
          </Link>
        ) : (
          action
        )}
      </div>
      <div className="mt-4 flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  );
}

function isLinkAction(
  action: unknown,
): action is { href: string; label: string } {
  return (
    typeof action === "object" &&
    action !== null &&
    "href" in action &&
    "label" in action
  );
}

/** Soft rounded square holding a 16px icon, used at the start of list rows. */
export function RowIcon({
  tone = "accent",
  children,
}: {
  tone?: "accent" | "amber" | "neutral";
  children: ReactNode;
}) {
  const tones = {
    accent: "bg-accent-soft text-accent",
    amber: "bg-[#fdf3e3] text-[#b45309]",
    neutral: "bg-[var(--atmosphere-1)] text-fg",
  } as const;
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}
      aria-hidden
    >
      {children}
    </span>
  );
}

/** Small status pill: "Answered" / "Needs review" / "Published" / "Draft". */
export function StatusPill({
  tone,
  children,
  className = "",
}: {
  tone: "green" | "amber" | "neutral";
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    green: "bg-accent-soft text-accent",
    amber: "bg-[#fdf3e3] text-[#b45309]",
    neutral: "bg-[var(--atmosphere-1)] text-muted",
  } as const;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium leading-none ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/** Calm centered empty-state block used inside cards. */
export function CardEmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl bg-[var(--atmosphere-1)]/70 px-5 py-8 text-center">
      <p className="font-display text-base text-fg text-balance">{title}</p>
      {description ? (
        <p className="max-w-[26rem] text-sm text-muted text-balance">
          {description}
        </p>
      ) : null}
      {children ? (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {children}
        </div>
      ) : null}
    </div>
  );
}

/** Grey shimmer lines while a card's data is loading. */
export function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <ul className="space-y-1" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 py-3">
          <span className="h-9 w-9 shrink-0 animate-pulse rounded-xl bg-[var(--atmosphere-1)]" />
          <span className="flex-1 space-y-2">
            <span className="block h-3.5 w-3/4 animate-pulse rounded bg-[var(--atmosphere-1)]" />
            <span className="block h-3 w-1/3 animate-pulse rounded bg-[var(--atmosphere-1)]" />
          </span>
        </li>
      ))}
    </ul>
  );
}
