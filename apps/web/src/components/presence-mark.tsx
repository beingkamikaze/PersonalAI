"use client";

import Image from "next/image";
import { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";

/**
 * Soft 3D presence companion for the dashboard panel (mockup).
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
    () => (reduceMotion ? undefined : { y: [0, -5, 0] }),
    [reduceMotion],
  );

  return (
    <div className="relative flex flex-col items-center text-center" aria-hidden>
      <motion.div
        className="relative w-full max-w-[150px]"
        animate={idle}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { duration: 5.5, repeat: Infinity, ease: "easeInOut" }
        }
      >
        <Image
          src="/dashboard/presence-companion-3d.png"
          alt=""
          width={300}
          height={300}
          className="h-auto w-full select-none"
          priority
        />
      </motion.div>
      <p className="mt-1 max-w-[13rem] font-display text-sm leading-snug text-fg text-balance">
        {allDone
          ? "You’re ready to share."
          : live
            ? "Your AI is live."
            : "Finish setup to publish."}
      </p>
      <p className="mt-1 text-[11px] text-muted">
        Small steps create extraordinary progress.
      </p>
    </div>
  );
}
