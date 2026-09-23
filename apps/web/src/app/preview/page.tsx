import { notFound } from "next/navigation";
import Link from "next/link";
import { isUiPreview } from "@/lib/env";

const groups = [
  {
    title: "Marketing",
    items: [
      { href: "/", label: "Landing" },
      { href: "/pricing", label: "Pricing" },
    ],
  },
  {
    title: "Auth",
    items: [
      { href: "/sign-up", label: "Sign up" },
      { href: "/sign-in", label: "Sign in" },
    ],
  },
  {
    title: "Onboarding",
    items: [
      { href: "/onboarding/create", label: "1. Create" },
      { href: "/onboarding/interview", label: "2. Interview" },
      { href: "/onboarding/knowledge", label: "3. Knowledge" },
      { href: "/onboarding/test", label: "4. Test" },
      { href: "/onboarding/publish", label: "5. Publish" },
    ],
  },
  {
    title: "App",
    items: [
      { href: "/app", label: "Dashboard (live)" },
      { href: "/app?incomplete=1", label: "Dashboard (setup)" },
      { href: "/app/knowledge", label: "Knowledge" },
      { href: "/app/memories", label: "Memories" },
      { href: "/app/chat", label: "Chat" },
      { href: "/app/conversations", label: "Conversations" },
      { href: "/app/settings", label: "Settings" },
    ],
  },
  {
    title: "Public",
    items: [{ href: "/u/mayank", label: "Public AI /u/mayank" }],
  },
] as const;

export default function PreviewIndexPage() {
  if (!isUiPreview()) notFound();

  return (
    <div className="atmosphere min-h-screen px-6 py-16 md:px-10">
      <div className="mx-auto w-full max-w-2xl">
        <p className="text-sm text-muted">Local only</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight text-fg">
          UI preview
        </h1>
        <p className="mt-3 text-muted text-balance">
          Click a screen to work on it. Forms that need the API will show mock
          content; they will not save until you sign in.
        </p>
        <div className="mt-10 space-y-10">
          {groups.map((group) => (
            <section key={group.title}>
              <h2 className="font-display text-xl text-fg">{group.title}</h2>
              <ul className="mt-3 divide-y divide-border border-t border-border">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="flex items-center justify-between py-3 text-sm text-fg hover:text-accent"
                    >
                      <span>{item.label}</span>
                      <span className="text-muted">{item.href}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
