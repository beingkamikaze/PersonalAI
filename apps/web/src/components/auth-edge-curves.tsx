/**
 * Partial double curves at the viewport edges of the auth pages.
 * Same marks on sign-in and sign-up. Clipped by the page shell so they
 * cannot widen the document.
 */
export function AuthEdgeCurves() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <CurveMark className="absolute -left-2 top-10 hidden h-32 w-8 text-fg/30 md:block xl:-left-1 xl:top-16 xl:h-52 xl:w-12" />
      <CurveMark className="absolute -right-2 bottom-2 hidden h-28 w-8 -scale-x-100 text-fg/30 md:block xl:-right-1 xl:bottom-6 xl:h-48 xl:w-10" />
    </div>
  );
}

function CurveMark({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 72 320" fill="none" className={className}>
      <path
        d="M -27.2 -22.8 A 232 232 0 0 1 -27.2 342.8"
        stroke="currentColor"
        strokeWidth="1.15"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M -43.2 -2.3 A 206 206 0 0 1 -43.2 322.3"
        stroke="currentColor"
        strokeWidth="1.15"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
