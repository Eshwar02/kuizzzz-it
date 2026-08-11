from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.user import User


class ClassroomTeacher(Base):
    __tablename__ = "classroom_teachers"
    classroom_id: Mapped[int] = mapped_column(
        ForeignKey("classrooms.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )


class ClassroomStudent(Base):
    __tablename__ = "classroom_students"
    classroom_id: Mapped[int] = mapped_column(
        ForeignKey("classrooms.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class Classroom(Base, TimestampMixin):
    __tablename__ = "classrooms"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    section: Mapped[str | None] = mapped_column(String(120), nullable=True)
    subject: Mapped[str | None] = mapped_column(String(120), nullable=True)
    theme_color: Mapped[str] = mapped_column(String(9), default="#B23A6F", nullable=False)
    join_code: Mapped[str] = mapped_column(String(12), unique=True, index=True, nullable=False)
    owner_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    owner: Mapped["User"] = relationship("User", foreign_keys=[owner_id])
    teachers: Mapped[list["User"]] = relationship(
        "User", secondary="classroom_teachers", viewonly=True
    )
    students: Mapped[list["User"]] = relationship(
        "User", secondary="classroom_students", viewonly=True
    )
