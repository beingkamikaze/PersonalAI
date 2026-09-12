import { SiteHeader } from "@/components/site-header";
import { ButtonLink } from "@/components/ui/button";

/**
 * Marketing landing — brand-first hero for common professionals.
 * Soft-launch copy (Phase 5). Keep one composition in the first viewport.
 */
export default function LandingPage() {
  return (
    <div className="atmosphere min-h-screen">
      <SiteHeader />
      <main>
        <section className="flex min-h-[calc(100vh-5rem)] flex-col justify-center px-6 pb-16 pt-10 md:px-10">
          <div className="mx-auto w-full max-w-3xl">
            <p className="font-display text-2xl text-fg md:text-3xl">PersonaAI</p>
            <h1 className="mt-6 font-display text-4xl leading-tight tracking-tight text-fg md:text-6xl">
              Your AI presence for when you&apos;re busy.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted text-balance">
              Built for professionals who live in meetings, email, and docs.
              Create your AI in 10–15 minutes. Share a public link so recruiters,
              clients, and teammates can learn who you are without waiting on
              your inbox.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <ButtonLink href="/sign-up">Create My AI</ButtonLink>
              <ButtonLink href="/pricing" variant="secondary">
                See pricing
              </ButtonLink>
            </div>
          </div>
        </section>

        <section className="border-t border-border px-6 py-16 md:px-10">
          <div className="mx-auto w-full max-w-3xl">
            <h2 className="font-display text-2xl text-fg md:text-3xl">
              How it works
            </h2>
            <p className="mt-3 max-w-xl text-muted text-balance">
              A short interview, your resume and notes, then a public page others
              can chat with — grounded in your knowledge, personality, and
              boundaries.
            </p>
            <ol className="mt-8 space-y-5 text-sm text-fg">
              <li className="border-t border-border pt-4">
                <span className="text-muted">1 · </span>
                Interview — capture how you work and what you&apos;re open to
              </li>
              <li className="border-t border-border pt-4">
                <span className="text-muted">2 · </span>
                Knowledge — upload a resume or notes your AI can cite
              </li>
              <li className="border-t border-border pt-4">
                <span className="text-muted">3 · </span>
                Publish — share /u/yourname in LinkedIn or your email signature
              </li>
            </ol>
            <div className="mt-10">
              <ButtonLink href="/sign-up">Start free</ButtonLink>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
