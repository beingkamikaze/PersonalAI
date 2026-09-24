import { Suspense } from "react";
import SignInForm from "./sign-in-form";

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="landing min-h-screen px-6 py-16 text-muted md:px-10">
          Loading…
        </div>
      }
    >
      <SignInForm />
    </Suspense>
  );
}
