export const INTERVIEW_COPY = [
  {
    title: "What should people call you?",
    hint: "Full name, then the name you actually use.",
    placeholder: "Mayank Sharma — most people just say Mayank.",
  },
  {
    title: "What do you do day to day?",
    hint: "Role, and the work that fills a normal week.",
    placeholder: "I write product UI, review PRs, and ship with a small team…",
  },
  {
    title: "What are you strongest at?",
    hint: "Skills and domains — a short list is enough.",
    placeholder: "TypeScript, product design, RAG systems…",
  },
  {
    title: "What work are you proud of lately?",
    hint: "A project or outcome, not a full resume.",
    placeholder: "Shipped a public AI profile that answers from a resume…",
  },
  {
    title: "Who usually reaches out to you?",
    hint: "Recruiters, clients, teammates — whoever this page is for.",
    placeholder: "Mostly hiring managers and founders…",
  },
  {
    title: "How do you prefer to communicate?",
    hint: "Async vs calls, short vs long, anything people should know.",
    placeholder: "Async first. Short written updates. Calls when it is a decision…",
  },
  {
    title: "What should this AI never invent?",
    hint: "Boundaries: salary, private contacts, employer secrets.",
    placeholder: "Do not invent compensation, personal numbers, or internal docs…",
  },
  {
    title: "What are you open to right now?",
    hint: "Roles, freelance, nothing — be honest.",
    placeholder: "Open to product and AI work, not full-time recruiting spam…",
  },
  {
    title: "What do people often get wrong about your work?",
    hint: "The misunderstanding you are tired of repeating.",
    placeholder: "People think I only do visuals. I own the product loop…",
  },
  {
    title: "What one-line headline should your page use?",
    hint: "This can match the headline from the create step.",
    placeholder: "Software engineer building personal AI products",
  },
] as const;

export function interviewCopy(index: number) {
  return INTERVIEW_COPY[Math.min(Math.max(index, 0), INTERVIEW_COPY.length - 1)];
}
