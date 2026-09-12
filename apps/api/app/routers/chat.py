"""Owner private chat — Phase 1–3 (identity + facts + RAG + memories)."""

from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from app.auth import get_current_user
from app.db import get_db
from app.llm import chat_completion
from app.logging_config import get_logger
from app.memory_extract import extract_memories_from_turn
from app.memory_retrieve import retrieve_memories
from app.models import Conversation, Message, PersonalityProfile, StructuredFact, User
from app.ownership import get_owned_profile
from app.prompt import build_owner_chat_messages
from app.rag import retrieve_chunks
from app.safety import enforce_reply_limit, prepare_user_message
from app.usage import assert_owner_chat_allowed
from app.schemas import (
    ChatIn,
    ChatMessageOut,
    ChatOut,
    ConversationDetailOut,
    ConversationOut,
)

logger = get_logger(__name__)

router = APIRouter(tags=["chat"])


async def _run_memory_extract(
    profile_id: UUID, user_message: str, assistant_reply: str
) -> None:
    """Offload memory extract so chat response is not delayed."""
    await run_in_threadpool(
        extract_memories_from_turn, profile_id, user_message, assistant_reply
    )


@router.post("/ai/{profile_id}/chat", response_model=ChatOut)
def owner_chat(
    profile_id: UUID,
    body: ChatIn,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ChatOut:
    profile = get_owned_profile(db, user, profile_id)
    # Phase 5 free-plan daily cap (before spending LLM tokens)
    remaining = assert_owner_chat_allowed(db, profile.id)

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
                detail="Only owner conversations are supported for memory writes",
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

    raw_user = body.message.strip()
    # Phase 5: truncate + wrap injection heuristics for the model only
    user_text = prepare_user_message(raw_user)
    # Phase 2 RAG + Phase 3 memories (both soft no-ops when empty)
    rag_chunks = retrieve_chunks(db, profile.id, raw_user)
    memories = retrieve_memories(db, profile.id)

    logger.info(
        "chat request profile_id=%s conversation_id=%s history=%s facts=%s "
        "has_personality=%s rag_chunks=%s memories=%s message_chars=%s "
        "chats_remaining=%s",
        profile.id,
        conversation.id,
        len(history),
        len(facts),
        personality is not None,
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
    db.commit()
    db.refresh(user_msg)
    db.refresh(assistant_msg)
    db.refresh(conversation)

    # Phase 3: extract memories after response is saved (owner channel only)
    background.add_task(_run_memory_extract, profile.id, raw_user, reply_text)
    logger.info(
        "memory extract enqueued profile_id=%s conversation_id=%s",
        profile.id,
        conversation.id,
    )

    logger.info(
        "chat ok profile_id=%s conversation_id=%s reply_chars=%s "
        "rag_chunks=%s memories=%s",
        profile.id,
        conversation.id,
        len(reply_text),
        len(rag_chunks),
        len(memories),
    )

    return ChatOut(
        conversation_id=conversation.id,
        reply=reply_text,
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
        .filter(Conversation.ai_profile_id == profile.id)
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
