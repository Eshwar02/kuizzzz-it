from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.attempt import Attempt
from app.models.enums import AttemptStatus, UserRole
from app.models.quiz import Quiz
from app.models.user import User
from app.schemas.dashboard import LeaderboardEntry

router = APIRouter(prefix="/api/leaderboard", tags=["leaderboard"])


@router.get("", response_model=list[LeaderboardEntry])
def leaderboard(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
    category_id: int | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
) -> list[LeaderboardEntry]:
    completed = Attempt.status != AttemptStatus.IN_PROGRESS
    stmt = (
        select(
            User.id,
            User.name,
            func.avg(Attempt.percentage).label("avg_score"),
            func.count(Attempt.id).label("completed"),
            func.max(Attempt.percentage).label("high_score"),
        )
        .join(Attempt, Attempt.user_id == User.id)
        .where(completed, User.role == UserRole.STUDENT)
    )
    if category_id is not None:
        stmt = stmt.join(Quiz, Quiz.id == Attempt.quiz_id).where(
            Quiz.category_id == category_id
        )
    stmt = (
        stmt.group_by(User.id, User.name)
        .order_by(func.avg(Attempt.percentage).desc(), func.count(Attempt.id).desc())
        .limit(limit)
    )

    entries: list[LeaderboardEntry] = []
    for rank, row in enumerate(db.execute(stmt).all(), start=1):
        entries.append(
            LeaderboardEntry(
                rank=rank,
                user_id=row.id,
                name=row.name,
                average_score=round(float(row.avg_score), 2),
                quizzes_completed=int(row.completed),
                highest_score=round(float(row.high_score), 2),
            )
        )
    return entries
