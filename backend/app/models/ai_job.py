from sqlalchemy import Enum as SAEnum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin
from app.models.enums import AIJobMode, AIJobStatus


class AIGenerationJob(Base, TimestampMixin):
    __tablename__ = "ai_generation_jobs"

    id: Mapped[int] = mapped_column(primary_key=True)
    faculty_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    quiz_id: Mapped[int | None] = mapped_column(
        ForeignKey("quizzes.id", ondelete="SET NULL"), nullable=True
    )
    mode: Mapped[AIJobMode] = mapped_column(SAEnum(AIJobMode, name="ai_job_mode"), nullable=False)
    inputs: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    model: Mapped[str] = mapped_column(String(120), nullable=False)
    status: Mapped[AIJobStatus] = mapped_column(
        SAEnum(AIJobStatus, name="ai_job_status"), default=AIJobStatus.PENDING, nullable=False
    )
    draft_questions: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
