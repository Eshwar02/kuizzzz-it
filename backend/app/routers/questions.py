from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import require_role
from app.db.session import get_db
from app.models.enums import QuestionSource, UserRole
from app.models.question import Option, Question
from app.models.quiz import Quiz
from app.models.user import User
from app.schemas.question import QuestionCreate, QuestionOut, QuestionUpdate
from app.services.authz import ensure_can_manage_quiz

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
    question = Question(
        quiz_id=quiz_id,
        question_text=payload.question_text,
        marks=payload.marks,
        explanation=payload.explanation,
        difficulty=payload.difficulty,
        source=QuestionSource.MANUAL,
        options=[
            Option(option_text=o.option_text, is_correct=o.is_correct) for o in payload.options
        ],
    )
    db.add(question)
    db.commit()
    db.refresh(question)
    return question


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
    for field in ("question_text", "marks", "explanation", "difficulty"):
        if field in data:
            setattr(question, field, data[field])
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
