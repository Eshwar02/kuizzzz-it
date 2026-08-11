from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.deps import get_current_user, require_role
from app.db.session import get_db
from app.models.attempt import Answer, Attempt
from app.models.enums import AttemptStatus, QuestionType, QuizStatus, UserRole
from app.models.question import Question
from app.models.quiz import Quiz
from app.models.user import User
from app.schemas.attempt import (
    AnswerReview,
    AttemptListItem,
    AttemptOption,
    AttemptQuestion,
    AttemptResult,
    StartAttemptResponse,
    SubmitAttemptRequest,
)
from app.services import scoring

router = APIRouter(prefix="/api", tags=["attempts"])

Student = require_role(UserRole.STUDENT)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _load_quiz_questions(db: Session, quiz_id: int) -> list[Question]:
    return list(
        db.scalars(
            select(Question)
            .where(Question.quiz_id == quiz_id)
            .options(selectinload(Question.options))
            .order_by(Question.id)
        ).all()
    )


def _expires_at(attempt: Attempt, quiz: Quiz) -> datetime:
    started = attempt.started_at
    if started.tzinfo is None:
        started = started.replace(tzinfo=timezone.utc)
    return started + timedelta(minutes=quiz.duration_minutes)


@router.post("/quizzes/{quiz_id}/start", response_model=StartAttemptResponse)
def start_attempt(
    quiz_id: int, db: Session = Depends(get_db), user: User = Depends(Student)
) -> StartAttemptResponse:
    quiz = db.get(Quiz, quiz_id)
    if quiz is None or quiz.status != QuizStatus.PUBLISHED:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not available")

    # Resume an in-progress attempt instead of creating duplicates.
    existing = db.scalar(
        select(Attempt).where(
            Attempt.quiz_id == quiz_id,
            Attempt.user_id == user.id,
            Attempt.status == AttemptStatus.IN_PROGRESS,
        )
    )
    if existing is None:
        completed_count = db.scalar(
            select(func.count(Attempt.id)).where(
                Attempt.quiz_id == quiz_id,
                Attempt.user_id == user.id,
                Attempt.status != AttemptStatus.IN_PROGRESS,
            )
        )
        if completed_count >= quiz.max_attempts:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You have reached the maximum number of attempts for this quiz",
            )
        existing = Attempt(quiz_id=quiz_id, user_id=user.id, started_at=_now())
        db.add(existing)
        db.commit()
        db.refresh(existing)

    questions = _load_quiz_questions(db, quiz_id)
    if not questions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="This quiz has no questions"
        )

    return StartAttemptResponse(
        attempt_id=existing.id,
        quiz_id=quiz.id,
        quiz_title=quiz.title,
        duration_minutes=quiz.duration_minutes,
        attempt_layout=quiz.attempt_layout,
        started_at=existing.started_at,
        expires_at=_expires_at(existing, quiz),
        questions=[
            AttemptQuestion(
                id=q.id,
                question_text=q.question_text,
                marks=q.marks,
                question_type=q.question_type,
                options=[AttemptOption(id=o.id, option_text=o.option_text) for o in q.options],
            )
            for q in questions
        ],
    )


@router.post("/quizzes/{quiz_id}/submit", response_model=AttemptResult)
def submit_attempt(
    quiz_id: int,
    payload: SubmitAttemptRequest,
    db: Session = Depends(get_db),
    user: User = Depends(Student),
) -> AttemptResult:
    attempt = db.get(Attempt, payload.attempt_id)
    if attempt is None or attempt.user_id != user.id or attempt.quiz_id != quiz_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found")
    if attempt.status != AttemptStatus.IN_PROGRESS:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Attempt already submitted"
        )

    quiz = db.get(Quiz, quiz_id)
    questions = _load_quiz_questions(db, quiz_id)
    valid_question_ids = {q.id for q in questions}
    option_to_question = {o.id: q.id for q in questions for o in q.options}

    # Build typed selections per question type, ignoring spoofed option ids.
    qtype = {q.id: q.question_type for q in questions}
    selections: dict[int, scoring.TypedSelection] = {}
    for ans in payload.answers:
        if ans.question_id not in valid_question_ids:
            continue
        t = qtype[ans.question_id]
        if t == QuestionType.FILL_BLANK:
            selections[ans.question_id] = scoring.TypedSelection(text=ans.text_answer)
        elif t == QuestionType.MULTIPLE_CHOICE:
            clean = [
                oid
                for oid in (ans.selected_option_ids or [])
                if option_to_question.get(oid) == ans.question_id
            ]
            selections[ans.question_id] = scoring.TypedSelection(option_ids=clean)
        else:
            opt = ans.selected_option_id
            if opt is not None and option_to_question.get(opt) != ans.question_id:
                opt = None
            selections[ans.question_id] = scoring.TypedSelection(option_id=opt)

    result = scoring.grade(
        questions,
        selections,
        quiz.passing_score,
        negative_marks=quiz.negative_marks_per_wrong if quiz.negative_marking_enabled else 0.0,
    )

    # Backend-authoritative timing: cap at the allotted duration (auto-submit at expiry).
    now = _now()
    elapsed = int((now - _expires_at(attempt, quiz)).total_seconds()) + quiz.duration_minutes * 60
    time_taken = max(0, min(elapsed, quiz.duration_minutes * 60))

    # Persist per-question answers.
    for ga in result.graded_answers:
        db.add(
            Answer(
                attempt_id=attempt.id,
                question_id=ga.question_id,
                selected_option_id=ga.selected_option_id,
                selected_option_ids=ga.selected_option_ids,
                text_answer=ga.text_answer,
                is_correct=ga.is_correct,
            )
        )

    attempt.score = result.obtained_marks
    attempt.percentage = result.percentage
    attempt.correct_answers = result.correct_answers
    attempt.incorrect_answers = result.incorrect_answers
    attempt.unanswered = result.unanswered
    attempt.time_taken = time_taken
    attempt.status = AttemptStatus.PASSED if result.passed else AttemptStatus.FAILED
    attempt.completed_at = now
    db.commit()
    db.refresh(attempt)

    return _build_result(db, attempt, quiz, questions)


@router.get("/attempts", response_model=list[AttemptListItem])
def list_my_attempts(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> list[AttemptListItem]:
    rows = db.execute(
        select(Attempt, Quiz.title)
        .join(Quiz, Quiz.id == Attempt.quiz_id)
        .where(Attempt.user_id == user.id)
        .order_by(Attempt.started_at.desc())
    ).all()
    items: list[AttemptListItem] = []
    for attempt, title in rows:
        item = AttemptListItem.model_validate(attempt)
        item.quiz_title = title
        items.append(item)
    return items


@router.get("/attempts/{attempt_id}", response_model=AttemptResult)
def get_attempt_result(
    attempt_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> AttemptResult:
    attempt = db.get(Attempt, attempt_id)
    if attempt is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found")
    if attempt.user_id != user.id and user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your attempt")
    if attempt.status == AttemptStatus.IN_PROGRESS:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Attempt not yet submitted"
        )
    quiz = db.get(Quiz, attempt.quiz_id)
    questions = _load_quiz_questions(db, attempt.quiz_id)
    return _build_result(db, attempt, quiz, questions)


def _build_result(
    db: Session, attempt: Attempt, quiz: Quiz, questions: list[Question]
) -> AttemptResult:
    answers = db.scalars(
        select(Answer).where(Answer.attempt_id == attempt.id)
    ).all()
    selected_by_q = {a.question_id: a.selected_option_id for a in answers}
    selected_ids_by_q = {a.question_id: a.selected_option_ids for a in answers}
    text_by_q = {a.question_id: a.text_answer for a in answers}
    correct_by_q = {a.question_id: a.is_correct for a in answers}

    review: list[AnswerReview] = []
    total_marks = 0
    for q in questions:
        total_marks += q.marks
        correct_ids = [o.id for o in q.options if o.is_correct]
        review.append(
            AnswerReview(
                question_id=q.id,
                question_text=q.question_text,
                explanation=q.explanation,
                marks=q.marks,
                question_type=q.question_type,
                selected_option_id=selected_by_q.get(q.id),
                correct_option_id=correct_ids[0] if correct_ids else None,
                correct_option_ids=correct_ids,
                accepted_answers=q.accepted_answers,
                selected_option_ids=selected_ids_by_q.get(q.id),
                text_answer=text_by_q.get(q.id),
                is_correct=correct_by_q.get(q.id, False),
                options=[AttemptOption(id=o.id, option_text=o.option_text) for o in q.options],
            )
        )

    base = AttemptResult.model_validate(attempt)
    base.quiz_title = quiz.title
    base.passing_score = quiz.passing_score
    base.total_questions = len(questions)
    base.total_marks = total_marks
    base.review = review
    return base
