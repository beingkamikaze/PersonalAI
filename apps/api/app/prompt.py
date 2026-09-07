"""Prompt builder v1 — identity + personality + facts only (no RAG / memories)."""

from __future__ import annotations

from app.models import AiProfile, Message, PersonalityProfile, StructuredFact


def build_owner_chat_messages(
    profile: AiProfile,
    personality: PersonalityProfile | None,
    facts: list[StructuredFact],
    history: list[Message],
    user_message: str,
) -> list[dict[str, str]]:
    """Assemble OpenAI chat messages for an owner private reply."""
    system = _system_prompt(profile, personality, facts)
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

    return "\n".join(lines)
