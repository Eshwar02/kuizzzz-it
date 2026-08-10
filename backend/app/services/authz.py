from fastapi import HTTPException, status

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
