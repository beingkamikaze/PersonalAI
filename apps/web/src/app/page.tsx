import { SiteHeader } from "@/components/site-header";
import { ButtonLink } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="atmosphere min-h-screen">
      <SiteHeader />
      <main className="flex min-h-[calc(100vh-5rem)] flex-col justify-center px-6 pb-20 pt-10 md:px-10">
        <div className="mx-auto w-full max-w-3xl">
          <p className="font-display text-2xl text-fg md:text-3xl">PersonaAI</p>
          <h1 className="mt-6 font-display text-4xl leading-tight tracking-tight text-fg md:text-6xl">
            Your AI presence for when you’re busy.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted text-balance">
            Create your professional AI in 10–15 minutes. Share a public link so
            others can learn who you are without waiting on your inbox.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <ButtonLink href="/sign-up">Create My AI</ButtonLink>
            <ButtonLink href="/pricing" variant="secondary">
              See pricing
            </ButtonLink>
          </div>
        </div>
      </main>
    </div>
  );
}
