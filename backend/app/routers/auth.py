import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models.enums import UserRole, UserStatus
from app.models.password_reset import PasswordResetToken
from app.models.user import User
from app.schemas.user import (
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    ResetPasswordRequest,
    Token,
    UserOut,
    UserRegister,
)

# How long a password-reset token stays valid.
RESET_TOKEN_TTL = timedelta(hours=1)


def _hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email.lower()))


def _client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


def _issue_token(user: User, client_ip: str | None = None) -> Token:
    token = create_access_token(subject=str(user.id), role=user.role.value)
    return Token(access_token=token, user=UserOut.model_validate(user), client_ip=client_ip)


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)) -> User:
    if _get_user_by_email(db, payload.email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Email already registered"
        )
    role = UserRole.FACULTY if payload.as_faculty else UserRole.STUDENT
    # Faculty accounts must be approved by an admin before they can log in.
    account_status = UserStatus.INACTIVE if payload.as_faculty else UserStatus.ACTIVE
    user = User(
        name=payload.name,
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        role=role,
        status=account_status,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=Token)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)) -> Token:
    user = _get_user_by_email(db, payload.email)
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password"
        )
    if user.status != UserStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is not active. Contact an administrator.",
        )
    return _issue_token(user, _client_ip(request))


@router.post("/login/token", response_model=Token, include_in_schema=False)
def login_form(
    request: Request, form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
) -> Token:
    """OAuth2 password-flow endpoint so Swagger 'Authorize' works (username=email)."""
    return login(LoginRequest(email=form.username, password=form.password), request, db)


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(
    payload: ForgotPasswordRequest, db: Session = Depends(get_db)
) -> ForgotPasswordResponse:
    """Issue a password-reset token.

    Always returns the same message regardless of whether the email exists, to
    avoid leaking which addresses are registered (user-enumeration defence).
    """
    generic = "If that email is registered, a password reset link has been generated."
    user = _get_user_by_email(db, payload.email)
    if user is None:
        return ForgotPasswordResponse(detail=generic)

    raw_token = secrets.token_urlsafe(32)
    reset = PasswordResetToken(
        user_id=user.id,
        token_hash=_hash_token(raw_token),
        expires_at=datetime.now(timezone.utc) + RESET_TOKEN_TTL,
    )
    db.add(reset)
    db.commit()
    # No mailer yet: hand the token back so the SPA can build the reset link.
    return ForgotPasswordResponse(detail=generic, reset_token=raw_token)


@router.post("/reset-password", response_model=UserOut)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)) -> User:
    reset = db.scalar(
        select(PasswordResetToken).where(
            PasswordResetToken.token_hash == _hash_token(payload.token)
        )
    )
    now = datetime.now(timezone.utc)
    if reset is None or reset.used_at is not None or reset.expires_at <= now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )
    user = db.get(User, reset.user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid reset token")
    user.password_hash = hash_password(payload.new_password)
    reset.used_at = now
    # Invalidate any other outstanding tokens for this user.
    for other in db.scalars(
        select(PasswordResetToken).where(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used_at.is_(None),
        )
    ):
        other.used_at = now
    db.commit()
    db.refresh(user)
    return user


@router.post("/logout")
def logout(_: User = Depends(get_current_user)) -> dict:
    # Stateless JWT: logout is handled client-side by discarding the token.
    return {"detail": "Logged out"}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)) -> User:
    return user
