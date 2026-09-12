"""Public profile + visitor chat (Phase 4).

No auth required. Memories are read for prompt context but never written.
Rate limited by IP + username.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.analytics import bump_conversation, bump_message, bump_visit
from app.db import get_db
from app.llm import chat_completion
from app.logging_config import get_logger
from app.memory_retrieve import retrieve_memories
from app.models import (
    AiProfile,
    Conversation,
    Message,
    PersonalityProfile,
    StructuredFact,
)
from app.prompt import build_owner_chat_messages
from app.rag import retrieve_chunks
from app.rate_limit import check_public_chat_rate
from app.safety import enforce_reply_limit, prepare_user_message
from app.schemas import ChatMessageOut, ChatOut, PublicChatIn, PublicProfileOut
from app.usernames import normalize_username, suggested_questions

logger = get_logger(__name__)

router = APIRouter(prefix="/public", tags=["public"])


def _published_profile(db: Session, username: str) -> AiProfile:
    uname = normalize_username(username)
    profile = (
        db.query(AiProfile)
        .filter(AiProfile.username == uname)
        .one_or_none()
    )
    if profile is None or profile.visibility != "published":
        logger.info("public profile miss username=%s", uname)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Public AI not found",
        )
    return profile


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


@router.get("/{username}", response_model=PublicProfileOut)
def get_public_profile(
    username: str,
    db: Session = Depends(get_db),
) -> PublicProfileOut:
    profile = _published_profile(db, username)
    bump_visit(db, profile.id)
    db.commit()
    logger.info(
        "public visit username=%s profile_id=%s",
        profile.username,
        profile.id,
    )
    return PublicProfileOut(
        username=profile.username or username,
        name=profile.name,
        headline=profile.headline,
        bio=profile.bio,
        avatar_url=profile.avatar_url,
        contact_email=profile.contact_email,
        calendar_link=profile.calendar_link,
        suggested_questions=suggested_questions(profile.name),
    )


@router.post("/{username}/chat", response_model=ChatOut)
def public_chat(
    username: str,
    body: PublicChatIn,
    request: Request,
    db: Session = Depends(get_db),
) -> ChatOut:
    """Visitor chat — published gate, rate limit, no memory writes."""
    profile = _published_profile(db, username)
    ip = _client_ip(request)
    allowed, remaining = check_public_chat_rate(ip, profile.username or username)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Try again later.",
        )

    conversation: Conversation | None = None
    is_new = False
    if body.conversation_id:
        conversation = (
            db.query(Conversation)
            .filter(Conversation.id == body.conversation_id)
            .one_or_none()
        )
        if (
            conversation is None
            or conversation.ai_profile_id != profile.id
            or conversation.channel != "public"
        ):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found",
            )
    else:
        conversation = Conversation(
            ai_profile_id=profile.id,
            channel="public",
            visitor_id=(body.visitor_id or None),
        )
        db.add(conversation)
        db.flush()
        is_new = True
        bump_conversation(db, profile.id)
        logger.info(
            "public chat new conversation id=%s profile_id=%s visitor=%s",
            conversation.id,
            profile.id,
            body.visitor_id,
        )

    history = (
        db.query(Message)
        .filter(Message.conversation_id == conversation.id)
        .order_by(Message.created_at.asc())
        .all()
    )

    personality = (
        db.query(PersonalityProfile)
        .filter(PersonalityProfile.ai_profile_id == profile.id)
        .one_or_none()
    )
    facts = (
        db.query(StructuredFact)
        .filter(StructuredFact.ai_profile_id == profile.id)
        .all()
    )

    raw_user = body.message.strip()
    user_text = prepare_user_message(raw_user)
    rag_chunks = retrieve_chunks(db, profile.id, raw_user)
    # Read memories for representation; do NOT extract/write from public chat
    memories = retrieve_memories(db, profile.id)

    logger.info(
        "public chat request profile_id=%s conversation_id=%s "
        "rag_chunks=%s memories=%s message_chars=%s rate_remaining=%s",
        profile.id,
        conversation.id,
        len(rag_chunks),
        len(memories),
        len(raw_user),
        remaining,
    )

    llm_messages = build_owner_chat_messages(
        profile,
        personality,
        facts,
        history,
        user_text,
        rag_chunks=rag_chunks,
        memories=memories,
        for_public=True,
    )

    try:
        reply = chat_completion(llm_messages, temperature=0.5)
    except Exception as exc:  # noqa: BLE001
        logger.exception(
            "public chat LLM failed profile_id=%s conversation_id=%s",
            profile.id,
            conversation.id,
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"LLM chat failed: {exc}",
        ) from exc

    reply_text = enforce_reply_limit(reply)
    user_msg = Message(
        conversation_id=conversation.id,
        role="user",
        content=raw_user,
    )
    assistant_msg = Message(
        conversation_id=conversation.id,
        role="assistant",
        content=reply_text,
    )
    db.add(user_msg)
    db.add(assistant_msg)
    bump_message(db, profile.id)
    db.commit()
    db.refresh(user_msg)
    db.refresh(assistant_msg)
    db.refresh(conversation)

    logger.info(
        "public chat ok profile_id=%s conversation_id=%s reply_chars=%s new=%s",
        profile.id,
        conversation.id,
        len(reply_text),
        is_new,
    )

    return ChatOut(
        conversation_id=conversation.id,
        reply=reply_text,
        messages=[
            ChatMessageOut.model_validate(user_msg),
            ChatMessageOut.model_validate(assistant_msg),
        ],
    )
