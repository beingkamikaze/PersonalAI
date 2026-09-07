"""Fixed professional interview — Phase 1.

POST /ai/{id}/interview/start
POST /ai/{id}/interview/answer  → LLM extract → personality + facts
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.auth import get_current_user
from app.db import get_db
from app.extract import extract_and_persist
from app.interview_script import get_question, question_count
from app.logging_config import get_logger
from app.models import InterviewSession, User
from app.ownership import get_owned_profile
from app.schemas import InterviewAnswerIn, InterviewAnswerOut, InterviewStartOut

logger = get_logger(__name__)

router = APIRouter(prefix="/ai", tags=["interview"])


@router.post("/{profile_id}/interview/start", response_model=InterviewStartOut)
def start_interview(
    profile_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> InterviewStartOut:
    profile = get_owned_profile(db, user, profile_id)
    total = question_count()

    session = (
        db.query(InterviewSession)
        .filter(InterviewSession.ai_profile_id == profile.id)
        .one_or_none()
    )
    created = session is None
    if session is None:
        session = InterviewSession(
            ai_profile_id=profile.id,
            current_index=0,
            status="in_progress",
            answers=[],
        )
        db.add(session)
        db.commit()
        db.refresh(session)

    completed = session.status == "completed"
    question = None if completed else get_question(session.current_index)

    logger.info(
        "interview start profile_id=%s session_id=%s created=%s status=%s index=%s",
        profile.id,
        session.id,
        created,
        session.status,
        session.current_index,
    )

    return InterviewStartOut(
        session_id=session.id,
        status=session.status,
        current_index=session.current_index,
        total_questions=total,
        question=question,
        completed=completed,
    )


@router.post("/{profile_id}/interview/answer", response_model=InterviewAnswerOut)
def answer_interview(
    profile_id: UUID,
    body: InterviewAnswerIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> InterviewAnswerOut:
    profile = get_owned_profile(db, user, profile_id)
    total = question_count()

    session = (
        db.query(InterviewSession)
        .filter(InterviewSession.ai_profile_id == profile.id)
        .one_or_none()
    )
    if session is None:
        logger.warning("interview answer without start profile_id=%s", profile_id)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Interview not started — call /interview/start first",
        )
    if session.status == "completed":
        logger.info("interview already completed profile_id=%s", profile.id)
        return InterviewAnswerOut(
            session_id=session.id,
            status=session.status,
            current_index=session.current_index,
            total_questions=total,
            question=None,
            completed=True,
            extracted=False,
        )

    q_index = session.current_index
    question = get_question(q_index)
    if question is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active interview question",
        )

    logger.info(
        "interview answer profile_id=%s q_index=%s answer_chars=%s",
        profile.id,
        q_index,
        len(body.answer.strip()),
    )

    # Append this Q&A to the session transcript
    answers = list(session.answers or [])
    answers.append(
        {
            "question_index": q_index,
            "question": question,
            "answer": body.answer.strip(),
        }
    )
    session.answers = answers

    # Structure answers into personality + facts (server-side LLM only)
    try:
        extract_and_persist(db, profile, answers)
        extracted = True
    except Exception as exc:  # noqa: BLE001
        logger.exception(
            "interview extract failed profile_id=%s q_index=%s",
            profile.id,
            q_index,
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"LLM extract failed: {exc}",
        ) from exc

    next_index = q_index + 1
    if next_index >= total:
        session.current_index = total
        session.status = "completed"
        profile.completeness_score = max(profile.completeness_score or 0, 40)
        next_question = None
        completed = True
        logger.info("interview completed profile_id=%s", profile.id)
    else:
        session.current_index = next_index
        next_question = get_question(next_index)
        completed = False

    flag_modified(session, "answers")

    db.commit()
    db.refresh(session)

    return InterviewAnswerOut(
        session_id=session.id,
        status=session.status,
        current_index=session.current_index,
        total_questions=total,
        question=next_question,
        completed=completed,
        extracted=extracted,
    )
