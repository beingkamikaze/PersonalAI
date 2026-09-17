"use client";

import Image from "next/image";
import { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";

/**
 * Soft 3D presence companion for the dashboard panel (mockup).
 * Fills the card height so it aligns with the Setup Checklist.
 */
export function PresenceMark({
  live = false,
  allDone = false,
}: {
  live?: boolean;
  allDone?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const idle = useMemo(
    () => (reduceMotion ? undefined : { y: [0, -6, 0] }),
    [reduceMotion],
  );

  return (
    <div className="relative flex h-full min-h-0 flex-col items-center justify-center gap-3 px-2 py-2 text-center sm:flex-row sm:items-center sm:gap-4 sm:text-left">
      <motion.div
        className="relative w-full max-w-[140px] shrink-0 sm:max-w-[150px]"
        animate={idle}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { duration: 5.5, repeat: Infinity, ease: "easeInOut" }
        }
        aria-hidden
      >
        <Image
          src="/dashboard/presence-companion-3d.png"
          alt=""
          width={336}
          height={336}
          className="h-auto w-full select-none drop-shadow-[0_18px_28px_rgba(15,31,28,0.12)]"
          priority
        />
      </motion.div>
      <blockquote className="max-w-[14rem] text-balance">
        <p className="font-display text-sm leading-snug text-fg italic">
          “Small steps create extraordinary progress.”
        </p>
        <p className="mt-1.5 text-xs text-muted">
          {allDone
            ? "— Keep going!"
            : live
              ? "— Your AI is live."
              : "— Finish setup to publish."}
        </p>
      </blockquote>
    </div>
  );
}
