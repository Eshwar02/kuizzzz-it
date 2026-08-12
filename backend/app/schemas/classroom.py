from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ClassroomCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    section: str | None = Field(default=None, max_length=120)
    subject: str | None = Field(default=None, max_length=120)
    theme_color: str | None = Field(default=None, max_length=9)


class ClassroomUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    section: str | None = Field(default=None, max_length=120)
    subject: str | None = Field(default=None, max_length=120)
    theme_color: str | None = Field(default=None, max_length=9)


class ClassroomMember(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: str


class ClassroomOut(BaseModel):
    id: int
    name: str
    section: str | None
    subject: str | None
    theme_color: str
    owner_id: int
    owner_name: str | None = None
    teacher_count: int = 0
    student_count: int = 0
    join_code: str | None = None  # teachers/admin only
    created_at: datetime


class ClassroomDetail(ClassroomOut):
    teachers: list[ClassroomMember] = Field(default_factory=list)
    students: list[ClassroomMember] = Field(default_factory=list)


class JoinRequest(BaseModel):
    code: str = Field(min_length=1, max_length=12)


class OwnerReassign(BaseModel):
    user_id: int


class TeacherAdd(BaseModel):
    user_id: int
