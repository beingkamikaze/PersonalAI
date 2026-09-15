"""Username helpers + suggested questions (Phase 4)."""

from __future__ import annotations

import re

# Public URL slug: lowercase letters, digits, hyphen/underscore; 3–40 chars
_USERNAME_RE = re.compile(r"^[a-z0-9]([a-z0-9_-]{1,38}[a-z0-9])?$")

_RESERVED = {
    "account",
    "admin",
    "api",
    "app",
    "auth",
    "feedback",
    "health",
    "me",
    "onboarding",
    "pricing",
    "profile",
    "public",
    "settings",
    "sign-in",
    "sign-up",
    "u",
    "www",
}


def normalize_username(raw: str) -> str:
    return raw.strip().lower()


def validate_username(raw: str) -> str:
    """Return normalized username or raise ValueError with a user-facing message."""
    username = normalize_username(raw)
    if len(username) < 3 or len(username) > 40:
        raise ValueError("Username must be 3–40 characters")
    if not _USERNAME_RE.match(username):
        raise ValueError(
            "Username may use lowercase letters, numbers, hyphens, and underscores"
        )
    if username in _RESERVED:
        raise ValueError("That username is reserved")
    return username


def suggested_questions(display_name: str) -> list[str]:
    """MVP suggested questions for common professionals (Implementation Plan §5)."""
    name = display_name.strip() or "them"
    return [
        f"What does {name} do?",
        f"What are {name}'s main skills?",
        f"How does {name} prefer to work?",
        f"What kind of work is {name} open to?",
        f"Tell me about {name}'s recent projects.",
    ]
