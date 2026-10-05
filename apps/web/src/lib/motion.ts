"use client";

import { useLayoutEffect, useState } from "react";
import { useReducedMotion, type Variants } from "motion/react";

/**
 * `useReducedMotion()` reads the device setting on the first client render.
 * The server always sees "no preference", so using that value in the first
 * paint (transforms, durations) makes hydration fail. This stays null until
 * after hydration, then follows the device.
 */
export function useHydratedReducedMotion(): boolean | null {
  const prefersReduced = useReducedMotion();
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);

  useLayoutEffect(() => {
    setReduceMotion(prefersReduced ? true : null);
  }, [prefersReduced]);

  return reduceMotion;
}

export function revealContainer(reduceMotion: boolean | null): Variants {
  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: reduceMotion
        ? { duration: 0 }
        : { staggerChildren: 0.08, delayChildren: 0.05 },
    },
  };
}

export function revealItem(reduceMotion: boolean | null): Variants {
  return {
    hidden: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14 },
    visible: {
      opacity: 1,
      y: 0,
      transition: reduceMotion
        ? { duration: 0 }
        : { type: "spring", stiffness: 320, damping: 28 },
    },
  };
}
