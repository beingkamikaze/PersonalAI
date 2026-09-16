"use client";

import { useMemo, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ButtonLink } from "@/components/ui/button";
import { Typewriter } from "@/components/typewriter";
import { isUiPreview } from "@/lib/env";
import { revealContainer, revealItem } from "@/lib/motion";

const REPLY =
  "Alex is a product engineer. They ship calm, credible AI presence pages — and they answer like this when they’re busy.";

export function LandingHero() {
  const preview = isUiPreview();
  const reduceMotion = useReducedMotion();
  const container = useMemo(
    () => revealContainer(reduceMotion),
    [reduceMotion],
  );
  const item = useMemo(() => revealItem(reduceMotion), [reduceMotion]);
  const createHref = preview ? "/onboarding/create" : "/sign-up";

  return (
    <motion.main
      className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-stretch px-6 pb-16 pt-8 text-center md:px-10 md:pt-12"
      initial="hidden"
      animate="visible"
      variants={container}
    >
      <motion.h1
        className="font-display text-4xl leading-[1.12] tracking-tight text-fg md:text-6xl lg:text-7xl text-balance"
        variants={item}
      >
        Your AI presence for when you’re busy.
      </motion.h1>
      <motion.p
        className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted md:text-lg text-balance"
        variants={item}
      >
        Create your professional AI in 10–15 minutes. Share a public link so
        others can learn who you are without waiting on your inbox.
      </motion.p>
      <motion.div
        className="mt-8 flex items-center justify-center gap-3"
        variants={item}
      >
        <ButtonLink href={createHref}>Create My AI</ButtonLink>
        <ButtonLink href="/pricing" variant="secondary">
          See pricing
        </ButtonLink>
      </motion.div>

      <motion.div className="mt-14 w-full" variants={item}>
        <div
          className="mx-auto w-full max-w-lg rounded-[28px] border-2 border-accent bg-elevated px-5 py-5 text-left"
          aria-label="Visitor chatting with a professional AI"
        >
          <div className="space-y-4">
            <ChatLine src="/landing/visitor.jpg" alt="Visitor">
              Can you introduce Alex?
            </ChatLine>
            <ChatLine src="/landing/alex.jpg" alt="Alex, a professional">
              <Typewriter phrases={[REPLY]} loop={false} />
            </ChatLine>
          </div>
        </div>
      </motion.div>
    </motion.main>
  );
}

function ChatLine({
  src,
  alt,
  children,
}: {
  src: string;
  alt: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        width={44}
        height={44}
        className="h-11 w-11 shrink-0 rounded-full object-cover object-top"
      />
      <p className="min-w-0 rounded-2xl bg-accent-soft px-3.5 py-2.5 text-sm leading-6 text-fg">
        {children}
      </p>
    </div>
  );
}
