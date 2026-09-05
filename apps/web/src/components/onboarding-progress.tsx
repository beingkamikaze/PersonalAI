const steps = [
  { href: "/onboarding/create", label: "Create" },
  { href: "/onboarding/interview", label: "Interview" },
  { href: "/onboarding/knowledge", label: "Knowledge" },
  { href: "/onboarding/test", label: "Test" },
  { href: "/onboarding/publish", label: "Publish" },
] as const;

export function OnboardingProgress({ step }: { step: number }) {
  return (
    <ol className="flex flex-wrap gap-2 text-xs text-muted md:gap-3">
      {steps.map((item, index) => {
        const n = index + 1;
        const done = n < step;
        const current = n === step;
        return (
          <li
            key={item.href}
            className={`rounded px-2.5 py-1 ${
              current
                ? "bg-accent/10 font-medium text-accent"
                : done
                  ? "text-fg"
                  : ""
            }`}
          >
            {n}. {item.label}
          </li>
        );
      })}
    </ol>
  );
}
