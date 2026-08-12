from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import QuizVisibility


class AssignmentItem(BaseModel):
    classroom_id: int
    whole_class: bool = True
    student_ids: list[int] = Field(default_factory=list)


class AssignmentSet(BaseModel):
    visibility: QuizVisibility
    assignments: list[AssignmentItem] = Field(default_factory=list)


class AssignmentView(BaseModel):
    id: int
    classroom_id: int
    classroom_name: str | None = None
    whole_class: bool
    student_ids: list[int] = Field(default_factory=list)


class QuizAssignments(BaseModel):
    visibility: QuizVisibility
    assignments: list[AssignmentView] = Field(default_factory=list)


class TodoItem(BaseModel):
    quiz_id: int
    quiz_title: str
    classroom_name: str | None = None
    available_until: datetime | None = None
    attempts_used: int = 0
    max_attempts: int = 1
