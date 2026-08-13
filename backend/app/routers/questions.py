from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import PlainTextResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import require_role
from app.db.session import get_db
from app.models.enums import QuestionSource, UserRole
from app.models.question import Option, Question
from app.models.quiz import Quiz
from app.models.user import User
from app.schemas.question import QuestionCreate, QuestionImportResult, QuestionOut, QuestionUpdate
from app.services.authz import ensure_can_manage_quiz
from app.services.question_import import TEMPLATE_CSV, parse_csv

# 2 MB is plenty for a text CSV and guards against accidental huge uploads.
MAX_IMPORT_BYTES = 2 * 1024 * 1024

router = APIRouter(prefix="/api", tags=["questions"])

FacultyOrAdmin = require_role(UserRole.FACULTY, UserRole.ADMIN)


def _get_quiz_or_404(db: Session, quiz_id: int) -> Quiz:
    quiz = db.get(Quiz, quiz_id)
    if quiz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")
    return quiz


def _get_question_or_404(db: Session, question_id: int) -> Question:
    question = db.get(Question, question_id)
    if question is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
    return question


@router.get("/quizzes/{quiz_id}/questions", response_model=list[QuestionOut])
def list_questions(
    quiz_id: int, db: Session = Depends(get_db), user: User = Depends(FacultyOrAdmin)
) -> list[Question]:
    quiz = _get_quiz_or_404(db, quiz_id)
    ensure_can_manage_quiz(user, quiz)
    return list(
        db.scalars(
            select(Question).where(Question.quiz_id == quiz_id).order_by(Question.id)
        ).all()
    )


@router.post(
    "/quizzes/{quiz_id}/questions",
    response_model=QuestionOut,
    status_code=status.HTTP_201_CREATED,
)
def create_question(
    quiz_id: int,
    payload: QuestionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(FacultyOrAdmin),
) -> Question:
    quiz = _get_quiz_or_404(db, quiz_id)
    ensure_can_manage_quiz(user, quiz)
    question = _persist_question(db, quiz_id, payload)
    db.add(question)
    db.commit()
    db.refresh(question)
    return question


def _persist_question(db: Session, quiz_id: int, payload: QuestionCreate) -> Question:
    return Question(
        quiz_id=quiz_id,
        question_text=payload.question_text,
        marks=payload.marks,
        explanation=payload.explanation,
        difficulty=payload.difficulty,
        question_type=payload.question_type,
        accepted_answers=payload.accepted_answers,
        source=QuestionSource.MANUAL,
        options=[
            Option(option_text=o.option_text, is_correct=o.is_correct)
            for o in (payload.options or [])
        ],
    )


@router.get("/questions/import-template", response_class=PlainTextResponse)
def import_template(_: User = Depends(FacultyOrAdmin)) -> PlainTextResponse:
    """Downloadable CSV template documenting the import format."""
    return PlainTextResponse(
        TEMPLATE_CSV,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=questions-template.csv"},
    )


@router.post("/quizzes/{quiz_id}/questions/import", response_model=QuestionImportResult)
async def import_questions(
    quiz_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(FacultyOrAdmin),
) -> QuestionImportResult:
    quiz = _get_quiz_or_404(db, quiz_id)
    ensure_can_manage_quiz(user, quiz)
    content = await file.read()
    if len(content) > MAX_IMPORT_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="CSV file too large (max 2 MB)",
        )
    questions, errors = parse_csv(content)
    # Import valid rows even if some rows failed; report the failures back.
    for payload in questions:
        db.add(_persist_question(db, quiz_id, payload))
    db.commit()
    return QuestionImportResult(created=len(questions), errors=errors)


@router.put("/questions/{question_id}", response_model=QuestionOut)
def update_question(
    question_id: int,
    payload: QuestionUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(FacultyOrAdmin),
) -> Question:
    question = _get_question_or_404(db, question_id)
    ensure_can_manage_quiz(user, question.quiz)
    data = payload.model_dump(exclude_unset=True)
    for field in ("question_text", "marks", "explanation", "difficulty", "question_type"):
        if field in data:
            setattr(question, field, data[field])
    if "accepted_answers" in data:
        question.accepted_answers = data["accepted_answers"]
    if payload.options is not None:
        # Replace the option set wholesale.
        question.options = [
            Option(option_text=o.option_text, is_correct=o.is_correct) for o in payload.options
        ]
    db.commit()
    db.refresh(question)
    return question


@router.delete("/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question(
    question_id: int, db: Session = Depends(get_db), user: User = Depends(FacultyOrAdmin)
) -> None:
    question = _get_question_or_404(db, question_id)
    ensure_can_manage_quiz(user, question.quiz)
    db.delete(question)
    db.commit()
