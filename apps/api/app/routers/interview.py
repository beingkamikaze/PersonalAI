"""Fixed professional interview — Phase 1.

POST /ai/{id}/interview/start
POST /ai/{id}/interview/answer  → save answer → next Q immediately;
  LLM extract runs in background (same pattern as owner-chat memory extract).
"""

from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from starlette.concurrency import run_in_threadpool

from app.auth import get_current_user
from app.db import get_db
from app.extract import run_interview_extract
from app.interview_script import get_question, question_count
from app.logging_config import get_logger
from app.models import InterviewSession, User
from app.ownership import get_owned_profile
from app.schemas import InterviewAnswerIn, InterviewAnswerOut, InterviewStartOut

logger = get_logger(__name__)

router = APIRouter(prefix="/ai", tags=["interview"])


async def _run_interview_extract(
    profile_id: UUID,
    answers: list[dict],
    *,
    refresh: bool,
) -> None:
    """Offload extract so Continue is not blocked on the LLM."""
    await run_in_threadpool(
        run_interview_extract, profile_id, answers, refresh=refresh
    )


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
    background: BackgroundTasks,
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

    next_index = q_index + 1
    if next_index >= total:
        session.current_index = total
        session.status = "completed"
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

    # LLM structuring happens after response — same pattern as chat memory extract
    background.add_task(
        _run_interview_extract,
        profile.id,
        answers,
        refresh=completed,
    )
    logger.info(
        "interview extract enqueued profile_id=%s q_index=%s answer_count=%s completed=%s",
        profile.id,
        q_index,
        len(answers),
        completed,
    )

    return InterviewAnswerOut(
        session_id=session.id,
        status=session.status,
        current_index=session.current_index,
        total_questions=total,
        question=next_question,
        completed=completed,
        extracted=False,
    )
