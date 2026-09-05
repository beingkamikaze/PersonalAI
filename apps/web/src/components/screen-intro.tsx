import { type ReactNode } from "react";

export function ScreenIntro({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="font-display text-3xl tracking-tight text-fg md:text-4xl">
        {title}
      </h1>
      <p className="mt-3 text-base text-muted text-balance">{description}</p>
      {children ? <div className="mt-8">{children}</div> : null}
    </div>
  );
}

export function ScaffoldNote({ children }: { children: ReactNode }) {
  return (
    <p className="mt-6 border-l-2 border-border pl-4 text-sm text-muted">
      {children}
    </p>
  );
}
