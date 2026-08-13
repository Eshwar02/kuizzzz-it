from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import UserRole, UserStatus


class UserBase(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr


class UserRegister(UserBase):
    password: str = Field(min_length=8, max_length=128)
    # Students self-register. Faculty registration creates an INACTIVE account
    # that an admin must approve. Admin accounts cannot be self-registered.
    as_faculty: bool = False


class UserCreate(UserBase):
    """Admin-side user creation."""

    password: str = Field(min_length=8, max_length=128)
    role: UserRole = UserRole.STUDENT
    status: UserStatus = UserStatus.ACTIVE


class UserUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    password: str | None = Field(default=None, min_length=8, max_length=128)
    role: UserRole | None = None
    status: UserStatus | None = None


class UserOut(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    role: UserRole
    status: UserStatus
    created_at: datetime


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
    client_ip: str | None = None


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    detail: str
    # No email service is configured yet, so the reset token is returned here for
    # the frontend to build the reset link. In production this would be emailed
    # and omitted from the response. See FUTURE_WORK.md (email notifications).
    reset_token: str | None = None


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=1)
    new_password: str = Field(min_length=8, max_length=128)
