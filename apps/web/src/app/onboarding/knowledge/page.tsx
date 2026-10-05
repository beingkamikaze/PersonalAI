"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import { useHydratedReducedMotion } from "@/lib/motion";
import { KnowledgePanel } from "@/components/knowledge-panel";
import { OnboardingProgress } from "@/components/onboarding-progress";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function OnboardingKnowledgePage() {
  const reduceMotion = useHydratedReducedMotion();
  const container = useMemo(
    () => ({
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: reduceMotion
          ? { duration: 0 }
          : { staggerChildren: 0.08, delayChildren: 0.04 },
      },
    }),
    [reduceMotion],
  );
  const item = useMemo(
    () => ({
      hidden: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 },
      visible: {
        opacity: 1,
        y: 0,
        transition: reduceMotion
          ? { duration: 0 }
          : { duration: 0.42, ease: EASE },
      },
    }),
    [reduceMotion],
  );

  return (
    <motion.div
      className="mx-auto w-full max-w-[1040px]"
      initial="hidden"
      animate="visible"
      variants={container}
    >
      <motion.header variants={item}>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
          Knowledge
        </p>
        <h1 className="mt-2 max-w-xl font-display text-4xl leading-[1.12] tracking-[-0.02em] text-fg md:text-[2.5rem]">
          Teach your AI what it should know.
        </h1>
        <p className="mt-2.5 max-w-2xl text-[15px] leading-relaxed text-muted text-balance">
          Add documents, notes, or links your AI can use when answering
          questions. Keep facts, preferences, and boundaries in Memory.
        </p>
      </motion.header>

      <motion.div className="mt-5" variants={item}>
        <OnboardingProgress step={3} />
      </motion.div>

      <div className="mx-auto mt-8 w-full max-w-[920px]">
        <KnowledgePanel continueHref="/onboarding/test" showSkip />
      </div>
    </motion.div>
  );
}
