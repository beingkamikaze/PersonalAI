"""Owner private chat — Phase 1 (identity + personality + facts; no RAG)."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.llm import chat_completion
from app.logging_config import get_logger
from app.models import Conversation, Message, PersonalityProfile, StructuredFact, User
from app.ownership import get_owned_profile
from app.prompt import build_owner_chat_messages
from app.schemas import (
    ChatIn,
    ChatMessageOut,
    ChatOut,
    ConversationDetailOut,
    ConversationOut,
)

logger = get_logger(__name__)

router = APIRouter(tags=["chat"])


@router.post("/ai/{profile_id}/chat", response_model=ChatOut)
def owner_chat(
    profile_id: UUID,
    body: ChatIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ChatOut:
    profile = get_owned_profile(db, user, profile_id)

    conversation: Conversation | None = None
    if body.conversation_id:
        conversation = (
            db.query(Conversation)
            .filter(Conversation.id == body.conversation_id)
            .one_or_none()
        )
        if conversation is None or conversation.ai_profile_id != profile.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found",
            )
        if conversation.channel != "owner":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only owner conversations are supported in Phase 1",
            )
    else:
        conversation = Conversation(ai_profile_id=profile.id, channel="owner")
        db.add(conversation)
        db.flush()
        logger.info(
            "chat new conversation id=%s profile_id=%s",
            conversation.id,
            profile.id,
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

    logger.info(
        "chat request profile_id=%s conversation_id=%s history=%s facts=%s has_personality=%s message_chars=%s",
        profile.id,
        conversation.id,
        len(history),
        len(facts),
        personality is not None,
        len(body.message.strip()),
    )

    llm_messages = build_owner_chat_messages(
        profile, personality, facts, history, body.message.strip()
    )

    try:
        reply = chat_completion(llm_messages, temperature=0.5)
    except Exception as exc:  # noqa: BLE001
        logger.exception(
            "chat LLM failed profile_id=%s conversation_id=%s",
            profile.id,
            conversation.id,
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"LLM chat failed: {exc}",
        ) from exc

    user_msg = Message(
        conversation_id=conversation.id,
        role="user",
        content=body.message.strip(),
    )
    assistant_msg = Message(
        conversation_id=conversation.id,
        role="assistant",
        content=reply.strip(),
    )
    db.add(user_msg)
    db.add(assistant_msg)
    db.commit()
    db.refresh(user_msg)
    db.refresh(assistant_msg)
    db.refresh(conversation)

    logger.info(
        "chat ok profile_id=%s conversation_id=%s reply_chars=%s",
        profile.id,
        conversation.id,
        len(reply.strip()),
    )

    return ChatOut(
        conversation_id=conversation.id,
        reply=reply.strip(),
        messages=[
            ChatMessageOut.model_validate(user_msg),
            ChatMessageOut.model_validate(assistant_msg),
        ],
    )


@router.get("/ai/{profile_id}/conversations", response_model=list[ConversationOut])
def list_conversations(
    profile_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[Conversation]:
    profile = get_owned_profile(db, user, profile_id)
    rows = (
        db.query(Conversation)
        .filter(
            Conversation.ai_profile_id == profile.id,
            Conversation.channel == "owner",
        )
        .order_by(Conversation.updated_at.desc())
        .all()
    )
    logger.debug(
        "chat list conversations profile_id=%s count=%s", profile.id, len(rows)
    )
    return rows


@router.get("/conversations/{conversation_id}", response_model=ConversationDetailOut)
def get_conversation(
    conversation_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ConversationDetailOut:
    conversation = (
        db.query(Conversation).filter(Conversation.id == conversation_id).one_or_none()
    )
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )
    get_owned_profile(db, user, conversation.ai_profile_id)
    messages = (
        db.query(Message)
        .filter(Message.conversation_id == conversation.id)
        .order_by(Message.created_at.asc())
        .all()
    )
    return ConversationDetailOut(
        id=conversation.id,
        channel=conversation.channel,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        messages=[ChatMessageOut.model_validate(m) for m in messages],
    )
