from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.enums import Difficulty, QuestionSource, QuestionType


class OptionIn(BaseModel):
    option_text: str = Field(min_length=1, max_length=500)
    is_correct: bool = False


class OptionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    option_text: str
    is_correct: bool


class QuestionBase(BaseModel):
    question_text: str = Field(min_length=1)
    marks: int = Field(default=1, ge=1, le=100)
    explanation: str | None = None
    difficulty: Difficulty = Difficulty.INTERMEDIATE
    question_type: QuestionType = QuestionType.SINGLE_CHOICE


def _validate_by_type(qtype, options, accepted):
    if qtype == QuestionType.FILL_BLANK:
        if not accepted or not [a for a in accepted if a and a.strip()]:
            raise ValueError("Fill-blank questions need at least one accepted answer")
        return
    if options is None:
        raise ValueError("Choice questions need options")
    n_correct = len([o for o in options if o.is_correct])
    if qtype == QuestionType.TRUE_FALSE:
        if len(options) != 2 or n_correct != 1:
            raise ValueError("True/False needs exactly two options, one correct")
    elif qtype == QuestionType.MULTIPLE_CHOICE:
        if n_correct < 1:
            raise ValueError("Multiple-choice needs at least one correct option")
    else:  # SINGLE_CHOICE
        if n_correct != 1:
            raise ValueError("Exactly one option must be marked correct")


class QuestionCreate(QuestionBase):
    options: list[OptionIn] | None = Field(default=None, max_length=6)
    accepted_answers: list[str] | None = None

    @model_validator(mode="after")
    def check(self) -> "QuestionCreate":
        if self.question_type != QuestionType.FILL_BLANK and self.options and len(self.options) < 2:
            raise ValueError("Choice questions need at least two options")
        _validate_by_type(self.question_type, self.options, self.accepted_answers)
        return self


class QuestionUpdate(BaseModel):
    question_text: str | None = Field(default=None, min_length=1)
    marks: int | None = Field(default=None, ge=1, le=100)
    explanation: str | None = None
    difficulty: Difficulty | None = None
    question_type: QuestionType | None = None
    options: list[OptionIn] | None = Field(default=None, max_length=6)
    accepted_answers: list[str] | None = None

    @model_validator(mode="after")
    def check(self) -> "QuestionUpdate":
        if self.question_type is not None:
            _validate_by_type(self.question_type, self.options, self.accepted_answers)
        return self


class QuestionOut(QuestionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    quiz_id: int
    source: QuestionSource
    accepted_answers: list[str] | None = None
    options: list[OptionOut]


class ImportRowError(BaseModel):
    row: int
    message: str


class QuestionImportResult(BaseModel):
    created: int
    errors: list[ImportRowError] = []
