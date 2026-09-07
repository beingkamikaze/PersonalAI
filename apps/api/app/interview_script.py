"""Fixed MVP interview script for common professionals.

The LLM does not invent questions — it only structures the user's answers
into personality fields + structured_facts.
"""

# Order matters: current_index maps into this list.
INTERVIEW_QUESTIONS: list[str] = [
    "What's your full name, and what should people call you?",
    "What's your current role, and what do you do day to day?",
    "What are your top skills or domains?",
    "What recent projects or outcomes are you proud of?",
    "Who usually reaches out to you (recruiters, clients, teammates)?",
    "How do you prefer to communicate (async, calls, short vs long messages)?",
    "What should your AI never say or invent about you?",
    "What opportunities are you open to right now?",
    "Is there anything people always misunderstand about your work?",
    "What's a one-line headline for your public page?",
]


def question_count() -> int:
    return len(INTERVIEW_QUESTIONS)


def get_question(index: int) -> str | None:
    if index < 0 or index >= len(INTERVIEW_QUESTIONS):
        return None
    return INTERVIEW_QUESTIONS[index]
