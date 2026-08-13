from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_role
from app.db.session import get_db
from app.models.attempt import Attempt
from app.models.category import Category
from app.models.enums import Difficulty, QuizStatus, QuizVisibility, UserRole
from app.models.question import Question
from app.models.quiz import Quiz
from app.models.user import User
from app.schemas.quiz import PublishRequest, QuizCreate, QuizDetail, QuizOut, QuizUpdate
from app.services import assignments as asvc
from app.services.authz import ensure_can_manage_quiz

router = APIRouter(prefix="/api/quizzes", tags=["quizzes"])


def _get_or_404(db: Session, quiz_id: int) -> Quiz:
    quiz = db.get(Quiz, quiz_id)
    if quiz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")
    return quiz


def _to_detail(db: Session, quiz: Quiz) -> QuizDetail:
    question_count = db.scalar(
        select(func.count(Question.id)).where(Question.quiz_id == quiz.id)
    )
    from app.models.assignment import QuizAssignment

    detail = QuizDetail.model_validate(quiz)
    detail.question_count = question_count or 0
    detail.assignment_count = db.scalar(
        select(func.count(QuizAssignment.id)).where(QuizAssignment.quiz_id == quiz.id)
    ) or 0
    detail.category_name = quiz.category.name if quiz.category else None
    detail.creator_name = quiz.creator.name if quiz.creator else None
    detail.attempt_count = db.scalar(
        select(func.count(Attempt.id)).where(Attempt.quiz_id == quiz.id)
    ) or 0
    return detail


@router.get("", response_model=list[QuizDetail])
def list_quizzes(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    category_id: int | None = Query(default=None),
    search: str | None = Query(default=None),
    difficulty: Difficulty | None = Query(default=None),
    max_duration: int | None = Query(default=None, ge=1, le=600),
    sort: str = Query(default="recent", pattern="^(recent|popular|duration)$"),
    mine: bool = Query(default=False),
) -> list[QuizDetail]:
    stmt = select(Quiz)
    if user.role == UserRole.STUDENT:
        # Students see published quizzes that are open-to-all or assigned to them.
        assigned = asvc.assigned_quiz_ids(db, user)
        stmt = stmt.where(
            Quiz.status == QuizStatus.PUBLISHED,
            (Quiz.visibility == QuizVisibility.OPEN) | (Quiz.id.in_(assigned)),
        )
    elif user.role == UserRole.FACULTY and mine:
        stmt = stmt.where(Quiz.created_by == user.id)
    # Admin sees everything (optionally filtered below).

    if category_id is not None:
        stmt = stmt.where(Quiz.category_id == category_id)
    if search:
        # Search by quiz title or category name.
        stmt = stmt.outerjoin(Quiz.category).where(
            Quiz.title.ilike(f"%{search}%") | Category.name.ilike(f"%{search}%")
        )
    if difficulty is not None:
        stmt = stmt.where(Quiz.difficulty == difficulty)
    if max_duration is not None:
        stmt = stmt.where(Quiz.duration_minutes <= max_duration)

    if sort == "popular":
        attempts = (
            select(func.count(Attempt.id))
            .where(Attempt.quiz_id == Quiz.id)
            .scalar_subquery()
        )
        stmt = stmt.order_by(attempts.desc(), Quiz.created_at.desc())
    elif sort == "duration":
        stmt = stmt.order_by(Quiz.duration_minutes.asc(), Quiz.created_at.desc())
    else:  # recent (default)
        stmt = stmt.order_by(Quiz.created_at.desc())
    return [_to_detail(db, q) for q in db.scalars(stmt).all()]


@router.get("/{quiz_id}", response_model=QuizDetail)
def get_quiz(
    quiz_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> QuizDetail:
    quiz = _get_or_404(db, quiz_id)
    # Students may only view quizzes open to them or assigned to them.
    if user.role == UserRole.STUDENT and not asvc.student_can_access(db, user, quiz):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")
    if (
        user.role == UserRole.FACULTY
        and quiz.created_by != user.id
        and quiz.status != QuizStatus.PUBLISHED
    ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")
    return _to_detail(db, quiz)


@router.post("", response_model=QuizOut, status_code=status.HTTP_201_CREATED)
def create_quiz(
    payload: QuizCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.FACULTY, UserRole.ADMIN)),
) -> Quiz:
    if payload.category_id is not None and db.get(Category, payload.category_id) is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid category")
    quiz = Quiz(**payload.model_dump(), created_by=user.id, status=QuizStatus.DRAFT)
    db.add(quiz)
    db.commit()
    db.refresh(quiz)
    return quiz


@router.put("/{quiz_id}", response_model=QuizOut)
def update_quiz(
    quiz_id: int,
    payload: QuizUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.FACULTY, UserRole.ADMIN)),
) -> Quiz:
    quiz = _get_or_404(db, quiz_id)
    ensure_can_manage_quiz(user, quiz)
    data = payload.model_dump(exclude_unset=True)
    if data.get("category_id") is not None and db.get(Category, data["category_id"]) is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid category")
    for field, value in data.items():
        setattr(quiz, field, value)
    db.commit()
    db.refresh(quiz)
    return quiz


@router.delete("/{quiz_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_quiz(
    quiz_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.FACULTY, UserRole.ADMIN)),
) -> None:
    quiz = _get_or_404(db, quiz_id)
    ensure_can_manage_quiz(user, quiz)
    db.delete(quiz)
    db.commit()


@router.patch("/{quiz_id}/publish", response_model=QuizOut)
def set_publish_status(
    quiz_id: int,
    payload: PublishRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.FACULTY, UserRole.ADMIN)),
) -> Quiz:
    quiz = _get_or_404(db, quiz_id)
    ensure_can_manage_quiz(user, quiz)
    if payload.status == QuizStatus.PUBLISHED:
        question_count = db.scalar(
            select(func.count(Question.id)).where(Question.quiz_id == quiz.id)
        )
        if not question_count:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot publish a quiz with no questions",
            )
    quiz.status = payload.status
    db.commit()
    db.refresh(quiz)
    return quiz
