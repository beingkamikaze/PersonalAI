"use client";

import Image from "next/image";
import { possessiveAiName } from "@/components/dashboard/format";
import { DASHBOARD_CARD_CLASS } from "@/components/dashboard/dashboard-card";
import { UserAvatar } from "@/components/user-avatar";

const stages = [
  { label: "Identity", step: 1 },
  { label: "Interview", step: 2 },
  { label: "Knowledge", step: 3 },
  { label: "Test", step: 4 },
  { label: "Share", step: 5 },
] as const;

/**
 * Live assistant preview. Reads the create form locally — no network calls.
 * `step` is the same 1-based onboarding index as `OnboardingProgress`.
 * Identity maps to step 1 (Create).
 */
export function AiPreviewCard({
  name,
  headline,
  avatarSrc,
  step,
}: {
  name: string | null;
  headline: string;
  avatarSrc?: string | null;
  step: number;
}) {
  const aiName = possessiveAiName(name);
  const headlineText = headline.trim();
  const hasPhoto = Boolean(avatarSrc);

  return (
    <section
      aria-label="AI preview"
      className={`${DASHBOARD_CARD_CLASS} h-full px-5 py-5 sm:px-6 sm:py-5`}
    >
      <div className="flex h-full flex-col items-center text-center">
        <div className="relative flex h-[188px] w-full items-end justify-center">
          <div
            className="pointer-events-none absolute bottom-2 left-1/2 h-[9.25rem] w-[9.25rem] -translate-x-1/2 rounded-full bg-accent-soft"
            aria-hidden
          />
          <div className="relative z-10 w-[176px]">
            <div className="animate-companion-float motion-reduce:animate-none">
              <Image
                src="/dashboard/chat-companion-3d-v2.png"
                alt=""
                width={420}
                height={420}
                priority
                className="relative z-10 h-auto w-full -translate-x-[7.4%] select-none"
              />
            </div>
            <div
              className="animate-companion-shadow pointer-events-none absolute bottom-1 left-1/2 h-2.5 w-[4.5rem] -translate-x-1/2 rounded-full bg-[#0f1f1c]/25 blur-[5px] motion-reduce:animate-none"
              aria-hidden
            />
            {hasPhoto ? (
              <div className="absolute -bottom-0.5 -right-0.5 z-20 rounded-full bg-white p-0.5 shadow-[0_8px_16px_-10px_rgba(15,31,28,0.45)] transition-opacity duration-300">
                <UserAvatar
                  name={name?.trim() || "You"}
                  src={avatarSrc}
                  size="md"
                />
              </div>
            ) : null}
          </div>
        </div>

        <h2 className="mt-1 font-display text-[1.65rem] leading-tight tracking-[-0.02em] text-fg text-balance">
          {aiName}
        </h2>
        <p
          className={`mx-auto mt-1.5 max-w-[17rem] text-sm leading-relaxed text-balance transition-colors duration-200 ${
            headlineText ? "text-fg" : "text-muted"
          }`}
        >
          {headlineText || "Your headline will appear here"}
        </p>

        <div className="mt-auto w-full max-w-[15rem] pt-5">
          <div className="border-t border-border pt-5">
            <p className="text-sm text-muted">Your AI is taking shape.</p>
            <ul className="mx-auto mt-3 w-fit space-y-2 text-left">
            {stages.map((stage) => {
              const reached = stage.step <= step;
              const current = stage.step === step;
              return (
                <li key={stage.label} className="flex items-center gap-2.5">
                  <span
                    aria-hidden
                    className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full transition-colors duration-300 motion-reduce:transition-none ${
                      reached
                        ? "bg-accent text-white"
                        : "border border-border bg-white"
                    }`}
                  >
                    {reached ? (
                      <svg
                        viewBox="0 0 16 16"
                        className="h-2.5 w-2.5"
                        fill="none"
                      >
                        <path
                          d="M3.5 8.5 6.5 11.5 12.5 4.5"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : null}
                  </span>
                  <span
                    className={`text-sm transition-colors duration-300 ${
                      current
                        ? "font-medium text-fg"
                        : reached
                          ? "text-fg"
                          : "text-muted"
                    }`}
                  >
                    {reached ? (
                      <span className="sr-only">Done: </span>
                    ) : (
                      <span className="sr-only">Not started: </span>
                    )}
                    {stage.label}
                  </span>
                </li>
              );
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
