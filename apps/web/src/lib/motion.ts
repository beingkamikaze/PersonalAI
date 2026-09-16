import { type Variants } from "motion/react";

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
