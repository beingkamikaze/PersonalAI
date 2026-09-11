from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class AiProfileCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    headline: str | None = Field(default=None, max_length=500)
    avatar_url: str | None = None


class AiProfileUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    headline: str | None = Field(default=None, max_length=500)
    avatar_url: str | None = None
    bio: str | None = None


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


class InterviewStartOut(BaseModel):
    session_id: UUID
    status: str
    current_index: int
    total_questions: int
    question: str | None
    completed: bool


class InterviewAnswerIn(BaseModel):
    answer: str = Field(min_length=1, max_length=4000)


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
