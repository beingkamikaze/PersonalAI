"use client";

import Image from "next/image";
import { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";

/**
 * Soft 3D presence companion for the dashboard (soft-launch welcome).
 */
export function PresenceMark({
  live = false,
  allDone = false,
  size = "md",
  className = "",
}: {
  live?: boolean;
  allDone?: boolean;
  size?: "md" | "lg";
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const idle = useMemo(
    () => (reduceMotion ? undefined : { y: [0, -8, 0] }),
    [reduceMotion],
  );
  const imageMax =
    size === "lg" ? "max-w-[200px] sm:max-w-[220px]" : "max-w-[150px]";

  return (
    <div
      className={`relative flex h-full min-h-0 flex-col items-center justify-center gap-4 px-2 py-3 text-center sm:flex-row sm:items-center sm:gap-5 sm:text-left ${className}`}
    >
      <motion.div
        className={`relative w-full shrink-0 ${imageMax}`}
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
      <blockquote className="max-w-[16rem] text-balance">
        <p
          className={`font-display leading-snug text-fg italic ${
            size === "lg" ? "text-base sm:text-lg" : "text-sm sm:text-base"
          }`}
        >
          {allDone
            ? "“You’re live. Go make someone’s day.”"
            : live
              ? "“Your AI is out there — keep feeding it.”"
              : "“Small steps create extraordinary progress.”"}
        </p>
        <p className="mt-2 text-xs text-muted sm:text-sm">
          {allDone
            ? "— Share your link or chat to test."
            : live
              ? "— Your public page is open."
              : "— Finish setup to publish."}
        </p>
      </blockquote>
    </div>
  );
}
