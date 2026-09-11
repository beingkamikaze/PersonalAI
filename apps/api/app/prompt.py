"""Prompt builder — identity + personality + facts + optional RAG chunks.

Phase 1: identity + personality + facts
Phase 2: adds retrieved document chunks when available (empty list = no change)
"""

from __future__ import annotations

from app.models import AiProfile, Message, PersonalityProfile, StructuredFact


def build_owner_chat_messages(
    profile: AiProfile,
    personality: PersonalityProfile | None,
    facts: list[StructuredFact],
    history: list[Message],
    user_message: str,
    rag_chunks: list[str] | None = None,
) -> list[dict[str, str]]:
    """Assemble OpenAI chat messages for an owner private reply."""
    system = _system_prompt(profile, personality, facts, rag_chunks or [])
    messages: list[dict[str, str]] = [{"role": "system", "content": system}]

    # Keep last N turns to control cost/context
    for msg in history[-12:]:
        if msg.role in ("user", "assistant"):
            messages.append({"role": msg.role, "content": msg.content})

    messages.append({"role": "user", "content": user_message})
    return messages


def _system_prompt(
    profile: AiProfile,
    personality: PersonalityProfile | None,
    facts: list[StructuredFact],
    rag_chunks: list[str],
) -> str:
    lines = [
        "You are a personal professional AI that represents a real person.",
        f"You represent {profile.name}"
        + (f", {profile.headline}" if profile.headline else "")
        + ".",
        "Speak in first person as this person when answering about them.",
        "Do not invent employer secrets, private contacts, emails, phone numbers, or confidential details.",
        "If you do not know something, say you do not have that information yet.",
        "Be concise and professionally helpful.",
        "Prefer facts from Known facts and Knowledge excerpts when they conflict with guesses.",
    ]

    if personality:
        lines.append("Personality:")
        for label, value in (
            ("communication_style", personality.communication_style),
            ("formality", personality.formality),
            ("humor", personality.humor),
            ("verbosity", personality.verbosity),
            ("directness", personality.directness),
        ):
            if value:
                lines.append(f"- {label}: {value}")
        if personality.traits:
            lines.append(f"- traits: {', '.join(str(t) for t in personality.traits)}")
        if personality.boundaries_json:
            lines.append(f"- boundaries: {personality.boundaries_json}")
        if personality.preferences_json:
            lines.append(f"- preferences: {personality.preferences_json}")

    if facts:
        lines.append("Known facts:")
        for fact in facts:
            lines.append(f"- {fact.key}: {fact.value}")

    if profile.bio:
        lines.append(f"Bio: {profile.bio}")

    # Phase 2 RAG — only present when retrieval found something
    if rag_chunks:
        lines.append(
            "Knowledge excerpts from uploaded documents (may be partial; "
            "do not invent beyond them):"
        )
        for i, chunk in enumerate(rag_chunks, start=1):
            # Cap each excerpt so the system prompt stays bounded
            excerpt = chunk.strip()
            if len(excerpt) > 1200:
                excerpt = excerpt[:1200] + "…"
            lines.append(f"[Excerpt {i}]\n{excerpt}")

    return "\n".join(lines)
