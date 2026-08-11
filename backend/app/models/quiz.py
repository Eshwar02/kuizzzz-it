from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum as SAEnum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import AttemptLayout, Difficulty, QuizStatus


class Quiz(Base, TimestampMixin):
    __tablename__ = "quizzes"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category_id: Mapped[int | None] = mapped_column(
        ForeignKey("categories.id", ondelete="SET NULL"), nullable=True
    )
    created_by: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    class_level: Mapped[str | None] = mapped_column(String(120), nullable=True)
    difficulty: Mapped[Difficulty] = mapped_column(
        SAEnum(Difficulty, name="difficulty"), default=Difficulty.INTERMEDIATE, nullable=False
    )
    duration_minutes: Mapped[int] = mapped_column(Integer, default=20, nullable=False)
    passing_score: Mapped[int] = mapped_column(Integer, default=60, nullable=False)
    max_attempts: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    status: Mapped[QuizStatus] = mapped_column(
        SAEnum(QuizStatus, name="quiz_status"), default=QuizStatus.DRAFT, nullable=False
    )
    thumbnail_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    negative_marking_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    negative_marks_per_wrong: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    shuffle_questions: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    shuffle_options: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    available_from: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    available_until: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    attempt_layout: Mapped[AttemptLayout] = mapped_column(
        SAEnum(AttemptLayout, name="attempt_layout"),
        default=AttemptLayout.SCROLL,
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    category: Mapped["Category | None"] = relationship(back_populates="quizzes")  # noqa: F821
    creator: Mapped["User"] = relationship(back_populates="quizzes")  # noqa: F821
    questions: Mapped[list["Question"]] = relationship(  # noqa: F821
        back_populates="quiz", cascade="all, delete-orphan"
    )
    attempts: Mapped[list["Attempt"]] = relationship(  # noqa: F821
        back_populates="quiz", cascade="all, delete-orphan"
    )
