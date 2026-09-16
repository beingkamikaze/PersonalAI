"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";

export function Typewriter({
  phrases,
  className = "",
  loop = true,
}: {
  phrases: readonly string[];
  className?: string;
  loop?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [text, setText] = useState(reduceMotion ? phrases[0] : "");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (reduceMotion || phrases.length === 0) return;

    const full = phrases[index % phrases.length];

    if (!deleting && text === full) {
      if (!loop) return;
      const pause = window.setTimeout(() => setDeleting(true), 1800);
      return () => window.clearTimeout(pause);
    }

    if (deleting && text.length === 0) {
      setDeleting(false);
      setIndex((n) => (n + 1) % phrases.length);
      return;
    }

    const delay = deleting ? 24 : 38;
    const tick = window.setTimeout(() => {
      setText(full.slice(0, text.length + (deleting ? -1 : 1)));
    }, delay);
    return () => window.clearTimeout(tick);
  }, [deleting, index, loop, phrases, reduceMotion, text]);

  return (
    <span className={className} aria-live="polite">
      <span>{text}</span>
      {reduceMotion ? null : (
        <span
          className="ml-0.5 inline-block h-[0.9em] w-px align-[-0.08em] bg-accent"
          aria-hidden
        />
      )}
    </span>
  );
}
