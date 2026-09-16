/**
 * PersonaAI mark + wordmark. Teal + ink only — same tokens as the rest of the UI.
 */
export function PersonaLogo({ height = 32 }: { height?: number }) {
  const mark = Math.round(height * 0.9);
  const type = Math.round(height * 0.56);

  return (
    <span className="inline-flex items-center gap-2.5 leading-none">
      <span
        aria-hidden
        className="inline-flex shrink-0 items-center justify-center rounded-md bg-accent font-display font-medium leading-none text-on-accent"
        style={{ width: mark, height: mark, fontSize: Math.round(mark * 0.52) }}
      >
        P
      </span>
      <span
        className="whitespace-nowrap font-display font-medium tracking-tight text-fg"
        style={{ fontSize: type }}
      >
        Persona<span className="text-accent">AI</span>
      </span>
    </span>
  );
}
