"use client";

import { Fragment } from "react";

const steps = [
  { href: "/onboarding/create", label: "Create" },
  { href: "/onboarding/interview", label: "Interview" },
  { href: "/onboarding/knowledge", label: "Knowledge" },
  { href: "/onboarding/test", label: "Test" },
  { href: "/onboarding/publish", label: "Share" },
] as const;

/**
 * Onboarding journey: 01 Create —— 02 Interview —— …
 * Teal marks the current and completed steps. `step` is 1-based.
 */
export function OnboardingProgress({ step }: { step: number }) {
  return (
    <nav aria-label="Onboarding progress" className="w-full">
      <ol className="flex w-full items-start md:items-center">
        {steps.map((item, index) => {
          const n = index + 1;
          const done = n < step;
          const current = n === step;
          const lineDone = n < step;

          return (
            <Fragment key={item.href}>
              <li
                className="flex min-w-0 shrink-0 flex-col items-center gap-1.5 md:flex-row md:gap-2"
                aria-current={current ? "step" : undefined}
              >
                <span
                  aria-hidden
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold tabular-nums transition-[background-color,color,box-shadow] duration-300 ease-out motion-reduce:transition-none ${
                    current
                      ? "bg-accent text-white shadow-[0_0_0_4px_var(--accent-soft)]"
                      : done
                        ? "bg-accent text-white"
                        : "border border-border bg-white text-muted"
                  }`}
                >
                  {done ? <CheckIcon /> : String(n).padStart(2, "0")}
                </span>
                <span
                  className={`max-w-[3.6rem] text-center text-[10px] leading-tight sm:max-w-[4.25rem] sm:text-[11px] md:max-w-none md:text-left md:text-[13px] ${
                    current
                      ? "font-medium text-accent"
                      : done
                        ? "text-fg"
                        : "text-muted"
                  }`}
                >
                  {done ? <span className="sr-only">Completed: </span> : null}
                  {item.label}
                </span>
              </li>
              {index < steps.length - 1 ? (
                <li
                  className="mx-1 mt-[13px] h-px min-w-[0.5rem] flex-1 list-none sm:mx-1.5 md:mx-2.5 md:mt-0"
                  aria-hidden
                >
                  <div
                    className={`h-px w-full transition-colors duration-300 motion-reduce:transition-none ${
                      lineDone ? "bg-accent/70" : "bg-border"
                    }`}
                  />
                </li>
              ) : null}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
      <path
        d="M3.5 8.5 6.5 11.5 12.5 4.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
