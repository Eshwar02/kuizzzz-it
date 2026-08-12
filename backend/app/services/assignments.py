"""Single source of truth for student access to a quiz.

A student may access a quiz iff it is PUBLISHED and either open-to-all or assigned
to them (whole-class in a class they're enrolled in, or individually targeted).
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.assignment import QuizAssignment, QuizAssignmentStudent
from app.models.classroom import ClassroomStudent
from app.models.enums import QuizStatus, QuizVisibility
from app.models.quiz import Quiz
from app.models.user import User


def assigned_quiz_ids(db: Session, user: User) -> set[int]:
    """Quiz ids assigned to this student (whole-class or individually targeted)."""
    my_classes = select(ClassroomStudent.classroom_id).where(
        ClassroomStudent.user_id == user.id
    )
    whole = db.scalars(
        select(QuizAssignment.quiz_id).where(
            QuizAssignment.classroom_id.in_(my_classes),
            QuizAssignment.whole_class.is_(True),
        )
    ).all()
    selected = db.scalars(
        select(QuizAssignment.quiz_id)
        .join(QuizAssignmentStudent, QuizAssignmentStudent.assignment_id == QuizAssignment.id)
        .where(
            QuizAssignment.classroom_id.in_(my_classes),
            QuizAssignment.whole_class.is_(False),
            QuizAssignmentStudent.user_id == user.id,
        )
    ).all()
    return set(whole) | set(selected)


def student_can_access(db: Session, user: User, quiz: Quiz) -> bool:
    if quiz.status != QuizStatus.PUBLISHED:
        return False
    if quiz.visibility == QuizVisibility.OPEN:
        return True
    return quiz.id in assigned_quiz_ids(db, user)
