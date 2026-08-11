from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import AttemptLayout, AttemptStatus, QuestionType


# ---- Taking a quiz (no correct-answer data exposed) ----
class AttemptOption(BaseModel):
    id: int
    option_text: str


class AttemptQuestion(BaseModel):
    id: int
    question_text: str
    marks: int
    question_type: QuestionType
    options: list[AttemptOption] = []


class StartAttemptResponse(BaseModel):
    attempt_id: int
    quiz_id: int
    quiz_title: str
    duration_minutes: int
    attempt_layout: AttemptLayout
    started_at: datetime
    expires_at: datetime
    questions: list[AttemptQuestion]


class SubmittedAnswer(BaseModel):
    question_id: int
    selected_option_id: int | None = None
    selected_option_ids: list[int] | None = None
    text_answer: str | None = None


class SubmitAttemptRequest(BaseModel):
    attempt_id: int
    answers: list[SubmittedAnswer] = Field(default_factory=list)


# ---- Results ----
class AttemptSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    quiz_id: int
    score: float
    percentage: float
    correct_answers: int
    incorrect_answers: int
    unanswered: int
    time_taken: int
    status: AttemptStatus
    started_at: datetime
    completed_at: datetime | None


class AttemptListItem(AttemptSummary):
    quiz_title: str | None = None


class AnswerReview(BaseModel):
    question_id: int
    question_text: str
    explanation: str | None
    marks: int
    question_type: QuestionType = QuestionType.SINGLE_CHOICE
    selected_option_id: int | None
    correct_option_id: int | None
    correct_option_ids: list[int] = Field(default_factory=list)
    accepted_answers: list[str] | None = None
    selected_option_ids: list[int] | None = None
    text_answer: str | None = None
    is_correct: bool
    options: list[AttemptOption]


class AttemptResult(AttemptSummary):
    quiz_title: str = ""
    passing_score: int = 0
    total_questions: int = 0
    total_marks: int = 0
    review: list[AnswerReview] = Field(default_factory=list)
