from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.enums import Difficulty, QuestionSource


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


class QuestionCreate(QuestionBase):
    options: list[OptionIn] = Field(min_length=2, max_length=6)

    @model_validator(mode="after")
    def exactly_one_correct(self) -> "QuestionCreate":
        correct = [o for o in self.options if o.is_correct]
        if len(correct) != 1:
            raise ValueError("Exactly one option must be marked correct")
        return self


class QuestionUpdate(BaseModel):
    question_text: str | None = Field(default=None, min_length=1)
    marks: int | None = Field(default=None, ge=1, le=100)
    explanation: str | None = None
    difficulty: Difficulty | None = None
    options: list[OptionIn] | None = Field(default=None, min_length=2, max_length=6)

    @model_validator(mode="after")
    def validate_options(self) -> "QuestionUpdate":
        if self.options is not None:
            correct = [o for o in self.options if o.is_correct]
            if len(correct) != 1:
                raise ValueError("Exactly one option must be marked correct")
        return self


class QuestionOut(QuestionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    quiz_id: int
    source: QuestionSource
    options: list[OptionOut]
