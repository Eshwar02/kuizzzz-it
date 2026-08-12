from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.classroom import Classroom, ClassroomStudent, ClassroomTeacher
from app.models.enums import UserRole
from app.models.quiz import Quiz
from app.models.user import User


def is_admin(user: User) -> bool:
    return user.role == UserRole.ADMIN


def can_manage_quiz(user: User, quiz: Quiz) -> bool:
    """Admins manage any quiz; faculty manage only their own."""
    return is_admin(user) or quiz.created_by == user.id


def ensure_can_manage_quiz(user: User, quiz: Quiz) -> None:
    if not can_manage_quiz(user, quiz):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only manage your own quizzes",
        )


def is_class_owner(user: User, classroom: Classroom) -> bool:
    return is_admin(user) or classroom.owner_id == user.id


def is_class_teacher(db: Session, user: User, classroom: Classroom) -> bool:
    if is_admin(user) or classroom.owner_id == user.id:
        return True
    return db.scalar(
        select(ClassroomTeacher).where(
            ClassroomTeacher.classroom_id == classroom.id,
            ClassroomTeacher.user_id == user.id,
        )
    ) is not None


def is_class_member(db: Session, user: User, classroom: Classroom) -> bool:
    if is_class_teacher(db, user, classroom):
        return True
    return db.scalar(
        select(ClassroomStudent).where(
            ClassroomStudent.classroom_id == classroom.id,
            ClassroomStudent.user_id == user.id,
        )
    ) is not None


def ensure_class_owner(user: User, classroom: Classroom) -> None:
    if not is_class_owner(user, classroom):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Owner only")


def ensure_class_teacher(db: Session, user: User, classroom: Classroom) -> None:
    if not is_class_teacher(db, user, classroom):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not a teacher of this class"
        )


def ensure_class_member(db: Session, user: User, classroom: Classroom) -> None:
    if not is_class_member(db, user, classroom):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this class"
        )
