from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import AttemptLayout, Difficulty, QuizStatus, QuizVisibility


class QuizCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    category_id: int | None = None
    class_level: str | None = Field(default=None, max_length=120)
    difficulty: Difficulty = Difficulty.INTERMEDIATE
    duration_minutes: int = Field(default=20, ge=1, le=600)
    passing_score: int = Field(default=60, ge=0, le=100)
    max_attempts: int = Field(default=1, ge=1, le=100)
    thumbnail_url: str | None = Field(default=None, max_length=500)
    negative_marking_enabled: bool = False
    negative_marks_per_wrong: float = Field(default=0.0, ge=0, le=100)
    shuffle_questions: bool = False
    shuffle_options: bool = False
    available_from: datetime | None = None
    available_until: datetime | None = None
    attempt_layout: AttemptLayout = AttemptLayout.SCROLL


class QuizUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    category_id: int | None = None
    class_level: str | None = Field(default=None, max_length=120)
    difficulty: Difficulty | None = None
    duration_minutes: int | None = Field(default=None, ge=1, le=600)
    passing_score: int | None = Field(default=None, ge=0, le=100)
    max_attempts: int | None = Field(default=None, ge=1, le=100)
    thumbnail_url: str | None = Field(default=None, max_length=500)
    negative_marking_enabled: bool | None = None
    negative_marks_per_wrong: float | None = Field(default=None, ge=0, le=100)
    shuffle_questions: bool | None = None
    shuffle_options: bool | None = None
    available_from: datetime | None = None
    available_until: datetime | None = None
    attempt_layout: AttemptLayout | None = None


class PublishRequest(BaseModel):
    status: QuizStatus


class QuizOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str | None
    category_id: int | None
    created_by: int
    class_level: str | None
    difficulty: Difficulty
    duration_minutes: int
    passing_score: int
    max_attempts: int
    status: QuizStatus
    visibility: QuizVisibility
    thumbnail_url: str | None
    negative_marking_enabled: bool
    negative_marks_per_wrong: float
    shuffle_questions: bool
    shuffle_options: bool
    available_from: datetime | None
    available_until: datetime | None
    attempt_layout: AttemptLayout
    created_at: datetime
    updated_at: datetime


class QuizDetail(QuizOut):
    """Quiz plus derived fields shown on the details page."""

    question_count: int = 0
    assignment_count: int = 0
    attempt_count: int = 0
    category_name: str | None = None
    creator_name: str | None = None
