from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.enums import AIJobMode, AIJobStatus, Difficulty
from app.schemas.question import OptionIn


class DraftQuestion(BaseModel):
    """A single AI-generated question in the same shape used to create questions."""

    question_text: str = Field(min_length=1)
    options: list[OptionIn] = Field(min_length=2, max_length=6)
    explanation: str | None = None
    difficulty: Difficulty = Difficulty.INTERMEDIATE
    marks: int = Field(default=1, ge=1, le=100)

    @model_validator(mode="after")
    def exactly_one_correct(self) -> "DraftQuestion":
        if sum(1 for o in self.options if o.is_correct) != 1:
            raise ValueError("Each question must have exactly one correct option")
        return self


class AIJobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    faculty_id: int
    quiz_id: int | None
    mode: AIJobMode
    inputs: dict
    model: str
    status: AIJobStatus
    draft_questions: list[dict]
    error: str | None
    created_at: datetime


class ApproveRequest(BaseModel):
    """Approve a generation job into a quiz. Faculty may edit drafts before approval."""

    quiz_id: int
    questions: list[DraftQuestion] = Field(min_length=1)
