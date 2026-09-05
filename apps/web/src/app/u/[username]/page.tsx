import { Button } from "@/components/ui/button";

const suggested = [
  "What does {Name} do?",
  "What are their main skills?",
  "How do they prefer to work?",
  "What kind of work are they open to?",
  "Tell me about recent projects.",
] as const;

export default function PublicAiPage({
  params,
}: {
  params: { username: string };
}) {
  const name = params.username;

  return (
    <div className="atmosphere min-h-screen">
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 py-12 md:px-10">
        <div className="flex items-start gap-4">
          <div
            aria-hidden
            className="h-16 w-16 shrink-0 rounded-full"
            style={{ background: "var(--atmosphere-2)" }}
          />
          <div>
            <h1 className="font-display text-3xl tracking-tight text-fg md:text-4xl">
              {name}
            </h1>
            <p className="mt-1 text-muted">
              Professional headline goes here
            </p>
            <p className="mt-4 max-w-xl text-sm text-muted text-balance">
              Short bio placeholder. Visitors chat with this public AI when{" "}
              {name} is busy.
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap gap-2">
          {suggested.map((q) => (
            <button
              key={q}
              type="button"
              className="rounded border border-border bg-elevated px-3 py-2 text-left text-sm text-fg hover:border-accent/40"
            >
              {q.replace("{Name}", name)}
            </button>
          ))}
        </div>

        <div className="mt-8 flex min-h-[280px] flex-1 flex-col rounded border border-border bg-elevated/80">
          <div className="flex-1 p-5 text-sm text-muted">
            Public chat placeholder — POST /public/:username/chat (rate limited)
          </div>
          <div className="flex gap-2 border-t border-border p-3">
            <input
              placeholder={`Ask ${name}’s AI…`}
              className="flex-1 rounded border border-border bg-white px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
            />
            <Button type="button">Send</Button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-4 text-sm">
          <a href="#" className="text-accent hover:text-accent-hover">
            Contact
          </a>
          <a href="#" className="text-accent hover:text-accent-hover">
            Book
          </a>
        </div>
      </main>
    </div>
  );
}
