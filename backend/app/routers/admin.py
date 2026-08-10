from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.deps import require_role
from app.db.session import get_db
from app.models.attempt import Attempt
from app.models.category import Category
from app.models.enums import AttemptStatus, QuizStatus, UserRole
from app.models.question import Question
from app.models.quiz import Quiz
from app.models.user import User
from app.schemas.attempt import AttemptListItem, AttemptResult
from app.schemas.dashboard import AdminAnalytics, AdminDashboard, CountPoint

router = APIRouter(prefix="/api/admin", tags=["admin"])

AdminOnly = require_role(UserRole.ADMIN)


@router.get("/dashboard", response_model=AdminDashboard)
def dashboard(db: Session = Depends(get_db), _: User = Depends(AdminOnly)) -> AdminDashboard:
    def count(stmt) -> int:
        return int(db.scalar(stmt) or 0)

    completed = Attempt.status != AttemptStatus.IN_PROGRESS
    return AdminDashboard(
        total_students=count(
            select(func.count(User.id)).where(User.role == UserRole.STUDENT)
        ),
        total_faculty=count(
            select(func.count(User.id)).where(User.role == UserRole.FACULTY)
        ),
        total_quizzes=count(select(func.count(Quiz.id))),
        published_quizzes=count(
            select(func.count(Quiz.id)).where(Quiz.status == QuizStatus.PUBLISHED)
        ),
        draft_quizzes=count(
            select(func.count(Quiz.id)).where(Quiz.status == QuizStatus.DRAFT)
        ),
        total_questions=count(select(func.count(Question.id))),
        total_attempts=count(select(func.count(Attempt.id)).where(completed)),
        average_score=round(
            float(
                db.scalar(
                    select(func.coalesce(func.avg(Attempt.percentage), 0.0)).where(completed)
                )
                or 0.0
            ),
            2,
        ),
        passed_attempts=count(
            select(func.count(Attempt.id)).where(Attempt.status == AttemptStatus.PASSED)
        ),
        failed_attempts=count(
            select(func.count(Attempt.id)).where(Attempt.status == AttemptStatus.FAILED)
        ),
    )


@router.get("/analytics", response_model=AdminAnalytics)
def analytics(db: Session = Depends(get_db), _: User = Depends(AdminOnly)) -> AdminAnalytics:
    completed = Attempt.status != AttemptStatus.IN_PROGRESS

    attempts_over_time = [
        CountPoint(label=str(day), value=float(cnt))
        for day, cnt in db.execute(
            select(func.date(Attempt.completed_at), func.count(Attempt.id))
            .where(completed, Attempt.completed_at.is_not(None))
            .group_by(func.date(Attempt.completed_at))
            .order_by(func.date(Attempt.completed_at))
        ).all()
    ]

    registrations_over_time = [
        CountPoint(label=str(day), value=float(cnt))
        for day, cnt in db.execute(
            select(func.date(User.created_at), func.count(User.id))
            .group_by(func.date(User.created_at))
            .order_by(func.date(User.created_at))
        ).all()
    ]

    passed = int(
        db.scalar(select(func.count(Attempt.id)).where(Attempt.status == AttemptStatus.PASSED))
        or 0
    )
    failed = int(
        db.scalar(select(func.count(Attempt.id)).where(Attempt.status == AttemptStatus.FAILED))
        or 0
    )

    popular_quizzes = [
        CountPoint(label=title, value=float(cnt))
        for title, cnt in db.execute(
            select(Quiz.title, func.count(Attempt.id))
            .join(Attempt, Attempt.quiz_id == Quiz.id)
            .where(completed)
            .group_by(Quiz.title)
            .order_by(func.count(Attempt.id).desc())
            .limit(5)
        ).all()
    ]

    popular_categories = [
        CountPoint(label=name, value=float(cnt))
        for name, cnt in db.execute(
            select(Category.name, func.count(Attempt.id))
            .join(Quiz, Quiz.category_id == Category.id)
            .join(Attempt, Attempt.quiz_id == Quiz.id)
            .where(completed)
            .group_by(Category.name)
            .order_by(func.count(Attempt.id).desc())
            .limit(5)
        ).all()
    ]

    return AdminAnalytics(
        attempts_over_time=attempts_over_time,
        registrations_over_time=registrations_over_time,
        pass_fail=[
            CountPoint(label="Passed", value=float(passed)),
            CountPoint(label="Failed", value=float(failed)),
        ],
        popular_quizzes=popular_quizzes,
        popular_categories=popular_categories,
    )


@router.get("/attempts", response_model=list[AttemptListItem])
def all_attempts(
    db: Session = Depends(get_db), _: User = Depends(AdminOnly)
) -> list[AttemptListItem]:
    rows = db.execute(
        select(Attempt, Quiz.title)
        .join(Quiz, Quiz.id == Attempt.quiz_id)
        .where(Attempt.status != AttemptStatus.IN_PROGRESS)
        .order_by(Attempt.completed_at.desc().nullslast())
    ).all()
    items: list[AttemptListItem] = []
    for attempt, title in rows:
        item = AttemptListItem.model_validate(attempt)
        item.quiz_title = title
        items.append(item)
    return items


@router.get("/attempts/{attempt_id}", response_model=AttemptResult)
def attempt_detail(
    attempt_id: int, db: Session = Depends(get_db), _: User = Depends(AdminOnly)
) -> AttemptResult:
    from app.routers.attempts import _build_result, _load_quiz_questions  # reuse

    attempt = db.get(Attempt, attempt_id)
    if attempt is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found")
    quiz = db.get(Quiz, attempt.quiz_id)
    questions = _load_quiz_questions(db, attempt.quiz_id)
    return _build_result(db, attempt, quiz, questions)
