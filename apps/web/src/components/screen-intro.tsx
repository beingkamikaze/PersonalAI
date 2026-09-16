"use client";

import { useMemo, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { revealContainer, revealItem } from "@/lib/motion";

/**
 * Shared onboarding / app screen chrome.
 * Page-load reveal uses Motion + design tokens (teal accent via children).
 */
export function ScreenIntro({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const container = useMemo(
    () => revealContainer(reduceMotion),
    [reduceMotion],
  );
  const item = useMemo(() => revealItem(reduceMotion), [reduceMotion]);

  return (
    <motion.div
      className="mx-auto w-full max-w-2xl"
      initial="hidden"
      animate="visible"
      variants={container}
    >
      <motion.h1
        className="font-display text-3xl tracking-tight text-fg md:text-4xl"
        variants={item}
      >
        {title}
      </motion.h1>
      <motion.p
        className="mt-3 text-base text-muted text-balance"
        variants={item}
      >
        {description}
      </motion.p>
      {children ? (
        <motion.div className="mt-8" variants={item}>
          {children}
        </motion.div>
      ) : null}
    </motion.div>
  );
}

export function ScaffoldNote({ children }: { children: ReactNode }) {
  return (
    <p className="mt-6 border-l-2 border-border pl-4 text-sm text-muted">
      {children}
    </p>
  );
}
