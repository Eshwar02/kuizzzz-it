from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.deps import require_role
from app.core.security import hash_password
from app.db.session import get_db
from app.models.attempt import Attempt
from app.models.enums import AttemptStatus, UserRole, UserStatus
from app.models.user import User
from app.schemas.dashboard import UserWithStats
from app.schemas.user import UserCreate, UserOut, UserUpdate

router = APIRouter(prefix="/api/users", tags=["users"])

AdminOnly = require_role(UserRole.ADMIN)


def _stats_for(db: Session, user_id: int) -> tuple[int, float, float]:
    row = db.execute(
        select(
            func.count(Attempt.id),
            func.coalesce(func.avg(Attempt.percentage), 0.0),
            func.coalesce(func.max(Attempt.percentage), 0.0),
        ).where(
            Attempt.user_id == user_id,
            Attempt.status != AttemptStatus.IN_PROGRESS,
        )
    ).one()
    return int(row[0]), round(float(row[1]), 2), round(float(row[2]), 2)


def _with_stats(db: Session, user: User) -> UserWithStats:
    attempted, avg, high = _stats_for(db, user.id)
    out = UserWithStats.model_validate(user)
    out.quizzes_attempted = attempted
    out.average_score = avg
    out.highest_score = high
    return out


@router.get("", response_model=list[UserWithStats])
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(AdminOnly),
    role: UserRole | None = Query(default=None),
    status_filter: UserStatus | None = Query(default=None, alias="status"),
    search: str | None = Query(default=None),
) -> list[UserWithStats]:
    stmt = select(User)
    if role is not None:
        stmt = stmt.where(User.role == role)
    if status_filter is not None:
        stmt = stmt.where(User.status == status_filter)
    if search:
        like = f"%{search}%"
        stmt = stmt.where((User.name.ilike(like)) | (User.email.ilike(like)))
    stmt = stmt.order_by(User.created_at.desc())
    return [_with_stats(db, u) for u in db.scalars(stmt).all()]


@router.get("/{user_id}", response_model=UserWithStats)
def get_user(
    user_id: int, db: Session = Depends(get_db), _: User = Depends(AdminOnly)
) -> UserWithStats:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return _with_stats(db, user)


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate, db: Session = Depends(get_db), _: User = Depends(AdminOnly)
) -> User:
    user = User(
        name=payload.name,
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        role=payload.role,
        status=payload.status,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Email already registered"
        )
    db.refresh(user)
    return user


@router.put("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(AdminOnly),
) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    data = payload.model_dump(exclude_unset=True)
    if "password" in data and data["password"]:
        user.password_hash = hash_password(data.pop("password"))
    else:
        data.pop("password", None)
    for field, value in data.items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}/status", response_model=UserOut)
def set_status(
    user_id: int,
    new_status: UserStatus = Query(alias="status"),
    db: Session = Depends(get_db),
    _: User = Depends(AdminOnly),
) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.status = new_status
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(AdminOnly),
) -> None:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot delete your own account"
        )
    db.delete(user)
    db.commit()
