from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_role
from app.db.session import get_db
from app.models.assignment import QuizAssignment, QuizAssignmentStudent
from app.models.attempt import Attempt
from app.models.classroom import Classroom, ClassroomStudent
from app.models.enums import AttemptStatus, QuizStatus, QuizVisibility, UserRole
from app.models.quiz import Quiz
from app.models.user import User
from app.schemas.assignment import AssignmentSet, AssignmentView, QuizAssignments, TodoItem
from app.services import assignments as asvc
from app.services import authz

router = APIRouter(prefix="/api/quizzes", tags=["assignments"])
todo_router = APIRouter(prefix="/api/assignments", tags=["assignments"])
Student = require_role(UserRole.STUDENT)


def _aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)


def _quiz_or_404(db: Session, quiz_id: int) -> Quiz:
    q = db.get(Quiz, quiz_id)
    if q is None:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return q


def _view(db: Session, quiz_id: int) -> QuizAssignments:
    quiz = db.get(Quiz, quiz_id)
    rows = db.scalars(select(QuizAssignment).where(QuizAssignment.quiz_id == quiz_id)).all()
    views = []
    for a in rows:
        c = db.get(Classroom, a.classroom_id)
        sids = db.scalars(
            select(QuizAssignmentStudent.user_id).where(
                QuizAssignmentStudent.assignment_id == a.id
            )
        ).all()
        views.append(
            AssignmentView(
                id=a.id,
                classroom_id=a.classroom_id,
                classroom_name=c.name if c else None,
                whole_class=a.whole_class,
                student_ids=list(sids),
            )
        )
    return QuizAssignments(visibility=quiz.visibility, assignments=views)


@router.get("/{quiz_id}/assignments", response_model=QuizAssignments)
def get_assignments(quiz_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    quiz = _quiz_or_404(db, quiz_id)
    authz.ensure_can_manage_quiz(user, quiz)
    return _view(db, quiz_id)


@router.put("/{quiz_id}/assignments", response_model=QuizAssignments)
def set_assignments(
    quiz_id: int, payload: AssignmentSet, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    quiz = _quiz_or_404(db, quiz_id)
    authz.ensure_can_manage_quiz(user, quiz)

    for a in db.scalars(select(QuizAssignment).where(QuizAssignment.quiz_id == quiz_id)).all():
        db.delete(a)
    db.flush()

    quiz.visibility = payload.visibility
    if payload.visibility == QuizVisibility.ASSIGNED:
        for item in payload.assignments:
            c = db.get(Classroom, item.classroom_id)
            if c is None or not authz.is_class_teacher(db, user, c):
                raise HTTPException(status_code=400, detail="You do not teach that classroom")
            a = QuizAssignment(
                quiz_id=quiz_id, classroom_id=item.classroom_id, whole_class=item.whole_class
            )
            db.add(a)
            db.flush()
            if not item.whole_class:
                if not item.student_ids:
                    raise HTTPException(status_code=400, detail="Select at least one student")
                for sid in item.student_ids:
                    enrolled = db.scalar(
                        select(ClassroomStudent).where(
                            ClassroomStudent.classroom_id == item.classroom_id,
                            ClassroomStudent.user_id == sid,
                        )
                    )
                    if enrolled is None:
                        raise HTTPException(status_code=400, detail="Student not in that classroom")
                    db.add(QuizAssignmentStudent(assignment_id=a.id, user_id=sid))
    db.commit()
    return _view(db, quiz_id)


@todo_router.get("/todo", response_model=list[TodoItem])
def todo(db: Session = Depends(get_db), user: User = Depends(Student)):
    now = datetime.now(timezone.utc)
    assigned = asvc.assigned_quiz_ids(db, user)
    if not assigned:
        return []
    items: list[TodoItem] = []
    quizzes = db.scalars(select(Quiz).where(Quiz.id.in_(assigned))).all()
    for q in quizzes:
        if q.status != QuizStatus.PUBLISHED:
            continue
        if q.available_from and now < _aware(q.available_from):
            continue
        if q.available_until and now > _aware(q.available_until):
            continue
        used = db.scalar(
            select(func.count(Attempt.id)).where(
                Attempt.quiz_id == q.id,
                Attempt.user_id == user.id,
                Attempt.status != AttemptStatus.IN_PROGRESS,
            )
        ) or 0
        if used >= q.max_attempts:
            continue
        cname = None
        a = db.scalar(select(QuizAssignment).where(QuizAssignment.quiz_id == q.id))
        if a:
            c = db.get(Classroom, a.classroom_id)
            cname = c.name if c else None
        items.append(
            TodoItem(
                quiz_id=q.id,
                quiz_title=q.title,
                classroom_name=cname,
                available_until=q.available_until,
                attempts_used=used,
                max_attempts=q.max_attempts,
            )
        )
    return items
