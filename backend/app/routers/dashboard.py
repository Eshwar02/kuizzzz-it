from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.deps import require_role
from app.db.session import get_db
from app.models.attempt import Answer, Attempt
from app.models.enums import (
    AttemptStatus,
    QuestionSource,
    QuizStatus,
    UserRole,
)
from app.models.question import Question
from app.models.quiz import Quiz
from app.models.user import User
from app.schemas.dashboard import FacultyDashboard, RecentAttempt, StudentDashboard

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/student", response_model=StudentDashboard)
def student_dashboard(
    db: Session = Depends(get_db), user: User = Depends(require_role(UserRole.STUDENT))
) -> StudentDashboard:
    completed = Attempt.status != AttemptStatus.IN_PROGRESS
    mine = (Attempt.user_id == user.id, completed)

    total = int(db.scalar(select(func.count(Attempt.id)).where(*mine)) or 0)
    passed = int(
        db.scalar(
            select(func.count(Attempt.id)).where(
                Attempt.user_id == user.id, Attempt.status == AttemptStatus.PASSED
            )
        )
        or 0
    )
    failed = int(
        db.scalar(
            select(func.count(Attempt.id)).where(
                Attempt.user_id == user.id, Attempt.status == AttemptStatus.FAILED
            )
        )
        or 0
    )
    avg = round(
        float(db.scalar(select(func.coalesce(func.avg(Attempt.percentage), 0.0)).where(*mine)) or 0),
        2,
    )
    high = round(
        float(db.scalar(select(func.coalesce(func.max(Attempt.percentage), 0.0)).where(*mine)) or 0),
        2,
    )
    answered = int(
        db.scalar(
            select(func.count(Answer.id))
            .join(Attempt, Attempt.id == Answer.attempt_id)
            .where(Attempt.user_id == user.id, Answer.selected_option_id.is_not(None))
        )
        or 0
    )

    recent = [
        RecentAttempt(
            attempt_id=a.id,
            quiz_title=title,
            percentage=a.percentage,
            status=a.status.value,
            completed_at=a.completed_at,
        )
        for a, title in db.execute(
            select(Attempt, Quiz.title)
            .join(Quiz, Quiz.id == Attempt.quiz_id)
            .where(Attempt.user_id == user.id, completed)
            .order_by(Attempt.completed_at.desc().nullslast())
            .limit(5)
        ).all()
    ]

    return StudentDashboard(
        total_attempted=total,
        passed=passed,
        failed=failed,
        average_score=avg,
        highest_score=high,
        total_questions_answered=answered,
        recent_attempts=recent,
    )


@router.get("/faculty", response_model=FacultyDashboard)
def faculty_dashboard(
    db: Session = Depends(get_db), user: User = Depends(require_role(UserRole.FACULTY))
) -> FacultyDashboard:
    my_quiz_ids = select(Quiz.id).where(Quiz.created_by == user.id)

    total_quizzes = int(
        db.scalar(select(func.count(Quiz.id)).where(Quiz.created_by == user.id)) or 0
    )
    published = int(
        db.scalar(
            select(func.count(Quiz.id)).where(
                Quiz.created_by == user.id, Quiz.status == QuizStatus.PUBLISHED
            )
        )
        or 0
    )
    drafts = int(
        db.scalar(
            select(func.count(Quiz.id)).where(
                Quiz.created_by == user.id, Quiz.status == QuizStatus.DRAFT
            )
        )
        or 0
    )
    total_questions = int(
        db.scalar(select(func.count(Question.id)).where(Question.quiz_id.in_(my_quiz_ids))) or 0
    )
    ai_questions = int(
        db.scalar(
            select(func.count(Question.id)).where(
                Question.quiz_id.in_(my_quiz_ids), Question.source == QuestionSource.AI
            )
        )
        or 0
    )
    total_attempts = int(
        db.scalar(
            select(func.count(Attempt.id)).where(
                Attempt.quiz_id.in_(my_quiz_ids),
                Attempt.status != AttemptStatus.IN_PROGRESS,
            )
        )
        or 0
    )
    avg = round(
        float(
            db.scalar(
                select(func.coalesce(func.avg(Attempt.percentage), 0.0)).where(
                    Attempt.quiz_id.in_(my_quiz_ids),
                    Attempt.status != AttemptStatus.IN_PROGRESS,
                )
            )
            or 0
        ),
        2,
    )

    return FacultyDashboard(
        total_quizzes=total_quizzes,
        published_quizzes=published,
        draft_quizzes=drafts,
        total_questions=total_questions,
        ai_generated_questions=ai_questions,
        total_attempts_on_my_quizzes=total_attempts,
        average_score_on_my_quizzes=avg,
    )
