"use client";

import { Fragment } from "react";
import { motion, useReducedMotion } from "motion/react";

const steps = [
  { href: "/onboarding/create", label: "Create" },
  { href: "/onboarding/interview", label: "Interview" },
  { href: "/onboarding/knowledge", label: "Knowledge" },
  { href: "/onboarding/test", label: "Test" },
  { href: "/onboarding/publish", label: "Publish" },
] as const;

/**
 * Onboarding stepper: ①——②——③ with teal (--accent) for done/current.
 */
export function OnboardingProgress({ step }: { step: number }) {
  const reduceMotion = useReducedMotion();

  return (
    <nav aria-label="Onboarding progress" className="w-full">
      <ol className="flex w-full items-start">
        {steps.map((item, index) => {
          const n = index + 1;
          const done = n < step;
          const current = n === step;
          const lineDone = n < step;

          return (
            <Fragment key={item.href}>
              <li className="flex min-w-0 shrink-0 flex-col items-center gap-1.5">
                <motion.span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold tabular-nums ${
                    current
                      ? "bg-accent text-white ring-4 ring-accent-soft"
                      : done
                        ? "bg-accent text-white"
                        : "border border-border bg-elevated text-muted"
                  }`}
                  aria-current={current ? "step" : undefined}
                  initial={false}
                  animate={
                    reduceMotion
                      ? undefined
                      : current
                        ? { scale: [1, 1.06, 1] }
                        : { scale: 1 }
                  }
                  transition={{ duration: 0.35, ease: "easeOut" }}
                >
                  {done ? (
                    <svg
                      viewBox="0 0 16 16"
                      className="h-3.5 w-3.5"
                      fill="none"
                      aria-hidden
                    >
                      <path
                        d="M3.5 8.5 6.5 11.5 12.5 4.5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    n
                  )}
                  <span className="sr-only">
                    {done ? "Completed: " : current ? "Current: " : ""}
                    {item.label}
                  </span>
                </motion.span>
                <span
                  className={`max-w-[4.5rem] text-center text-[11px] leading-tight sm:max-w-none sm:text-xs ${
                    current
                      ? "font-medium text-accent"
                      : done
                        ? "text-fg"
                        : "text-muted"
                  }`}
                >
                  {item.label}
                </span>
              </li>
              {index < steps.length - 1 ? (
                <li
                  className="mx-1 mt-4 min-w-[0.75rem] flex-1 list-none sm:mx-2"
                  aria-hidden
                >
                  <div
                    className={`h-0.5 w-full rounded-full transition-colors ${
                      lineDone ? "bg-accent" : "bg-border"
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
