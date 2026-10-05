/** Mirrors `suggested_questions` in `apps/api/app/usernames.py`. */
export function suggestedQuestions(displayName: string): string[] {
  const name = displayName.trim() || "them";
  return [
    `What does ${name} do?`,
    `What are ${name}'s main skills?`,
    `How does ${name} prefer to work?`,
    `What kind of work is ${name} open to?`,
    `Tell me about ${name}'s recent projects.`,
  ];
}
