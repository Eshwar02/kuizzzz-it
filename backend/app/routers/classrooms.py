import secrets
import string

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_role
from app.db.session import get_db
from app.models.classroom import Classroom, ClassroomStudent, ClassroomTeacher
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.classroom import (
    ClassroomCreate,
    ClassroomDetail,
    ClassroomMember,
    ClassroomOut,
    ClassroomUpdate,
    JoinRequest,
    OwnerReassign,
    TeacherAdd,
)
from app.services import authz

router = APIRouter(prefix="/api/classrooms", tags=["classrooms"])

Faculty = require_role(UserRole.FACULTY)
Student = require_role(UserRole.STUDENT)
Admin = require_role(UserRole.ADMIN)
_ALPHABET = string.ascii_uppercase + string.digits


def _gen_code(db: Session) -> str:
    while True:
        code = "".join(secrets.choice(_ALPHABET) for _ in range(6))
        if db.scalar(select(Classroom).where(Classroom.join_code == code)) is None:
            return code


def _counts(db: Session, cid: int) -> tuple[int, int]:
    t = db.scalar(
        select(func.count()).select_from(ClassroomTeacher).where(ClassroomTeacher.classroom_id == cid)
    )
    s = db.scalar(
        select(func.count()).select_from(ClassroomStudent).where(ClassroomStudent.classroom_id == cid)
    )
    return t or 0, s or 0


def _get_or_404(db: Session, cid: int) -> Classroom:
    c = db.get(Classroom, cid)
    if c is None:
        raise HTTPException(status_code=404, detail="Classroom not found")
    return c


def _serialize(db: Session, c: Classroom, *, with_code: bool, detail: bool = False, with_roster: bool = False):
    tcount, scount = _counts(db, c.id)
    base = ClassroomOut(
        id=c.id,
        name=c.name,
        section=c.section,
        subject=c.subject,
        theme_color=c.theme_color,
        owner_id=c.owner_id,
        owner_name=c.owner.name if c.owner else None,
        teacher_count=tcount,
        student_count=scount,
        join_code=c.join_code if with_code else None,
        created_at=c.created_at,
    )
    if not detail:
        return base
    teachers = db.scalars(
        select(User).join(ClassroomTeacher, ClassroomTeacher.user_id == User.id).where(
            ClassroomTeacher.classroom_id == c.id
        )
    ).all()
    students = (
        db.scalars(
            select(User).join(ClassroomStudent, ClassroomStudent.user_id == User.id).where(
                ClassroomStudent.classroom_id == c.id
            )
        ).all()
        if with_roster
        else []
    )
    return ClassroomDetail(
        **base.model_dump(),
        teachers=[ClassroomMember.model_validate(t) for t in teachers],
        students=[ClassroomMember.model_validate(s) for s in students],
    )


@router.post("", response_model=ClassroomDetail, status_code=201)
def create_classroom(
    payload: ClassroomCreate, db: Session = Depends(get_db), user: User = Depends(Faculty)
):
    c = Classroom(
        name=payload.name,
        section=payload.section,
        subject=payload.subject,
        theme_color=payload.theme_color or "#B23A6F",
        join_code=_gen_code(db),
        owner_id=user.id,
    )
    db.add(c)
    db.flush()
    db.add(ClassroomTeacher(classroom_id=c.id, user_id=user.id))
    db.commit()
    db.refresh(c)
    return _serialize(db, c, with_code=True, detail=True, with_roster=True)


@router.get("", response_model=list[ClassroomOut])
def list_classrooms(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role == UserRole.ADMIN:
        rows = db.scalars(select(Classroom)).all()
        return [_serialize(db, c, with_code=True) for c in rows]
    if user.role == UserRole.FACULTY:
        rows = db.scalars(
            select(Classroom).join(
                ClassroomTeacher, ClassroomTeacher.classroom_id == Classroom.id
            ).where(ClassroomTeacher.user_id == user.id)
        ).all()
        return [_serialize(db, c, with_code=True) for c in rows]
    rows = db.scalars(
        select(Classroom).join(
            ClassroomStudent, ClassroomStudent.classroom_id == Classroom.id
        ).where(ClassroomStudent.user_id == user.id)
    ).all()
    return [_serialize(db, c, with_code=False) for c in rows]


@router.post("/join", response_model=ClassroomDetail)
def join_classroom(payload: JoinRequest, db: Session = Depends(get_db), user: User = Depends(Student)):
    c = db.scalar(select(Classroom).where(Classroom.join_code == payload.code.upper()))
    if c is None:
        raise HTTPException(status_code=404, detail="Invalid class code")
    exists = db.scalar(
        select(ClassroomStudent).where(
            ClassroomStudent.classroom_id == c.id, ClassroomStudent.user_id == user.id
        )
    )
    if exists:
        raise HTTPException(status_code=409, detail="Already enrolled")
    db.add(ClassroomStudent(classroom_id=c.id, user_id=user.id))
    db.commit()
    return _serialize(db, c, with_code=False, detail=True, with_roster=False)


@router.get("/{cid}", response_model=ClassroomDetail)
def get_classroom(cid: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    c = _get_or_404(db, cid)
    authz.ensure_class_member(db, user, c)
    teacher = authz.is_class_teacher(db, user, c)
    return _serialize(db, c, with_code=teacher, detail=True, with_roster=teacher)


@router.put("/{cid}", response_model=ClassroomDetail)
def update_classroom(
    cid: int, payload: ClassroomUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    c = _get_or_404(db, cid)
    authz.ensure_class_teacher(db, user, c)
    for f, v in payload.model_dump(exclude_unset=True).items():
        setattr(c, f, v)
    db.commit()
    db.refresh(c)
    return _serialize(db, c, with_code=True, detail=True, with_roster=True)


@router.delete("/{cid}", status_code=204)
def delete_classroom(cid: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    c = _get_or_404(db, cid)
    authz.ensure_class_owner(user, c)
    db.delete(c)
    db.commit()


@router.delete("/{cid}/leave", status_code=204)
def leave_classroom(cid: int, db: Session = Depends(get_db), user: User = Depends(Student)):
    row = db.scalar(
        select(ClassroomStudent).where(
            ClassroomStudent.classroom_id == cid, ClassroomStudent.user_id == user.id
        )
    )
    if row is None:
        raise HTTPException(status_code=404, detail="You are not in this class")
    db.delete(row)
    db.commit()


@router.delete("/{cid}/students/{uid}", status_code=204)
def remove_student(
    cid: int, uid: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    c = _get_or_404(db, cid)
    authz.ensure_class_teacher(db, user, c)
    row = db.scalar(
        select(ClassroomStudent).where(
            ClassroomStudent.classroom_id == cid, ClassroomStudent.user_id == uid
        )
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Student not in class")
    db.delete(row)
    db.commit()


@router.post("/{cid}/teachers", response_model=ClassroomDetail)
def add_teacher(
    cid: int, payload: TeacherAdd, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    c = _get_or_404(db, cid)
    authz.ensure_class_owner(user, c)
    target = db.get(User, payload.user_id)
    if target is None or target.role != UserRole.FACULTY:
        raise HTTPException(status_code=400, detail="Co-teacher must be a faculty user")
    if db.scalar(
        select(ClassroomTeacher).where(
            ClassroomTeacher.classroom_id == cid, ClassroomTeacher.user_id == target.id
        )
    ):
        raise HTTPException(status_code=409, detail="Already a teacher")
    db.add(ClassroomTeacher(classroom_id=cid, user_id=target.id))
    db.commit()
    return _serialize(db, c, with_code=True, detail=True, with_roster=True)


@router.delete("/{cid}/teachers/{uid}", status_code=204)
def remove_teacher(
    cid: int, uid: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    c = _get_or_404(db, cid)
    authz.ensure_class_owner(user, c)
    if uid == c.owner_id:
        raise HTTPException(status_code=400, detail="Cannot remove the owner")
    row = db.scalar(
        select(ClassroomTeacher).where(
            ClassroomTeacher.classroom_id == cid, ClassroomTeacher.user_id == uid
        )
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Not a teacher")
    db.delete(row)
    db.commit()


@router.patch("/{cid}/owner", response_model=ClassroomDetail)
def reassign_owner(
    cid: int, payload: OwnerReassign, db: Session = Depends(get_db), user: User = Depends(Admin)
):
    c = _get_or_404(db, cid)
    target = db.get(User, payload.user_id)
    if target is None or target.role != UserRole.FACULTY:
        raise HTTPException(status_code=400, detail="Owner must be a faculty user")
    c.owner_id = target.id
    if not db.scalar(
        select(ClassroomTeacher).where(
            ClassroomTeacher.classroom_id == cid, ClassroomTeacher.user_id == target.id
        )
    ):
        db.add(ClassroomTeacher(classroom_id=cid, user_id=target.id))
    db.commit()
    db.refresh(c)
    return _serialize(db, c, with_code=True, detail=True, with_roster=True)


@router.post("/{cid}/regenerate-code", response_model=ClassroomDetail)
def regenerate_code(cid: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    c = _get_or_404(db, cid)
    authz.ensure_class_owner(user, c)
    c.join_code = _gen_code(db)
    db.commit()
    db.refresh(c)
    return _serialize(db, c, with_code=True, detail=True, with_roster=True)
