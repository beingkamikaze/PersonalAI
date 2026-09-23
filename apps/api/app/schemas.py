from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


class AiProfileCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    headline: str | None = Field(default=None, max_length=500)
    avatar_url: str | None = None


class AiProfileUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    headline: str | None = Field(default=None, max_length=500)
    avatar_url: str | None = None
    bio: str | None = None
    # Phase 4 — public identity + external CTAs
    username: str | None = Field(default=None, min_length=3, max_length=40)
    contact_email: str | None = Field(default=None, max_length=320)
    calendar_link: str | None = Field(default=None, max_length=500)


class AiProfileOut(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    username: str | None
    headline: str | None
    bio: str | None
    avatar_url: str | None
    visibility: str
    contact_email: str | None
    calendar_link: str | None
    completeness_score: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PublishIn(BaseModel):
    """Optional fields applied atomically with publish."""

    username: str | None = Field(default=None, min_length=3, max_length=40)
    contact_email: str | None = Field(default=None, max_length=320)
    calendar_link: str | None = Field(default=None, max_length=500)
    bio: str | None = None
    headline: str | None = Field(default=None, max_length=500)


class InterviewStartOut(BaseModel):
    session_id: UUID
    status: str
    current_index: int
    total_questions: int
    question: str | None
    completed: bool


class InterviewAnswerIn(BaseModel):
    answer: str = Field(default="", max_length=4000)
    skipped: bool = False

    @model_validator(mode="after")
    def require_answer_unless_skipped(self) -> "InterviewAnswerIn":
        if not self.skipped and not self.answer.strip():
            raise ValueError("answer is required unless skipped")
        return self


class InterviewAnswerOut(BaseModel):
    session_id: UUID
    status: str
    current_index: int
    total_questions: int
    question: str | None
    completed: bool
    extracted: bool


class PersonalityOut(BaseModel):
    ai_profile_id: UUID
    communication_style: str | None = None
    formality: str | None = None
    humor: str | None = None
    verbosity: str | None = None
    directness: str | None = None
    languages: list[Any] = Field(default_factory=list)
    traits: list[Any] = Field(default_factory=list)
    preferences_json: dict[str, Any] = Field(default_factory=dict)
    values_json: dict[str, Any] = Field(default_factory=dict)
    boundaries_json: dict[str, Any] = Field(default_factory=dict)
    facts: list[dict[str, str]] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class PersonalityUpdate(BaseModel):
    communication_style: str | None = None
    formality: str | None = None
    humor: str | None = None
    verbosity: str | None = None
    directness: str | None = None
    languages: list[Any] | None = None
    traits: list[Any] | None = None
    preferences_json: dict[str, Any] | None = None
    values_json: dict[str, Any] | None = None
    boundaries_json: dict[str, Any] | None = None


# Owner edit of interview/manual structured facts (Profile page).
# Separate from PersonalityUpdate so PATCH /personality stays unchanged.
class FactItemUpdate(BaseModel):
    key: str = Field(min_length=1, max_length=120)
    value: str = Field(max_length=4000)


class FactsUpdate(BaseModel):
    facts: list[FactItemUpdate] = Field(default_factory=list)


class FactsOut(BaseModel):
    ai_profile_id: UUID
    facts: list[dict[str, str]] = Field(default_factory=list)


class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    conversation_id: UUID | None = None


class ChatMessageOut(BaseModel):
    id: UUID
    role: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatOut(BaseModel):
    conversation_id: UUID
    reply: str
    messages: list[ChatMessageOut]


class ConversationOut(BaseModel):
    id: UUID
    channel: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ConversationDetailOut(BaseModel):
    id: UUID
    channel: str
    created_at: datetime
    updated_at: datetime
    messages: list[ChatMessageOut]


# --- Phase 2: Knowledge ---


class DocumentOut(BaseModel):
    id: UUID
    ai_profile_id: UUID
    filename: str
    file_url: str | None = None
    mime_type: str | None = None
    source_type: str
    source_url: str | None = None
    status: str
    error_message: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class NotesIn(BaseModel):
    content: str = Field(min_length=1, max_length=50_000)
    title: str | None = Field(default=None, max_length=200)


class UrlIn(BaseModel):
    url: str = Field(min_length=8, max_length=2000)


# --- Phase 3: Memories ---


class MemoryOut(BaseModel):
    id: UUID
    ai_profile_id: UUID
    memory_type: str
    content: str
    importance: float
    confidence: float
    source: str
    created_at: datetime
    last_accessed: datetime

    model_config = {"from_attributes": True}


class MemoryUpdate(BaseModel):
    content: str | None = Field(default=None, min_length=1, max_length=2000)
    memory_type: str | None = None
    importance: float | None = Field(default=None, ge=0, le=1)
    confidence: float | None = Field(default=None, ge=0, le=1)


# --- Phase 4: Public + analytics ---


class PublicProfileOut(BaseModel):
    """Safe public payload — no owner user_id."""

    username: str
    name: str
    headline: str | None = None
    bio: str | None = None
    avatar_url: str | None = None
    contact_email: str | None = None
    calendar_link: str | None = None
    suggested_questions: list[str] = Field(default_factory=list)


class PublicChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    conversation_id: UUID | None = None
    visitor_id: str | None = Field(default=None, max_length=120)


class AnalyticsSummaryOut(BaseModel):
    visibility: str
    username: str | None
    completeness_score: int
    completeness_checklist: dict[str, bool] = Field(default_factory=dict)
    visits_today: int
    visits_7d: int
    conversations_7d: int
    messages_7d: int
    public_url_path: str | None = None
    # Free-plan usage (Phase 5)
    owner_chats_used_today: int = 0
    owner_chats_limit: int = 40
    owner_chats_remaining: int = 40
    documents_used: int = 0
    documents_limit: int = 8
    documents_remaining: int = 8


class AccountDeleteIn(BaseModel):
    """Owner must type their email (or DELETE if no email) to wipe the account."""

    confirmation: str = Field(min_length=1, max_length=320)


class FeedbackIn(BaseModel):
    message: str = Field(min_length=5, max_length=4000)
    email: str | None = Field(default=None, max_length=320)
    source: str = Field(default="app", max_length=40)


class FeedbackOut(BaseModel):
    id: UUID
    created_at: datetime
    message: str = "Thanks — we received your feedback."
