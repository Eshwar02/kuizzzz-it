# Classrooms & Enrollment (Slice A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Google-Classroom-style classrooms — faculty create classes with a join code, students self-enroll, co-teachers supported, admin has full oversight; plus the reusable class-card UI and management pages.

**Architecture:** Three new tables (`classrooms`, `classroom_teachers`, `classroom_students`) via one Alembic migration. A `/api/classrooms` router with role-scoped listing and membership/co-teacher management, guarded by new authz helpers. Frontend adds an axios wrapper, a reusable `ClassCard`, and management pages for faculty/student/admin wired into routes + sidebar.

**Tech Stack:** Backend — FastAPI, SQLAlchemy 2.0, Alembic, Pydantic v2, pytest. Frontend — Vite + React 18, React Router v6, Axios, Tailwind.

## Global Constraints

- Backend authoritative for membership + role checks. Students never see a class's `join_code` or student roster; only teachers/admin do.
- Every user in `classroom_teachers` must be FACULTY; every user in `classroom_students` must be STUDENT. The class creator is the owner and also gets a teacher row.
- Owner-only actions: delete class, reassign owner (admin only), add/remove co-teacher, regenerate code. Admin may do anything.
- One Alembic migration creates all three tables; apply with `alembic upgrade head` before pytest (tests run against dev Postgres in a rolled-back transaction).
- Existing pytest suite + `vite build` must stay green after every task.
- Follow existing patterns: `Mapped[...]` columns, routers with `prefix="/api"` + `require_role(...)`, boxy Tailwind UI kit, axios `api` client, `.venv` for backend commands.
- Commit messages: no `Co-Authored-By` trailer.

---

### Task 1: Models + migration

**Files:**
- Create: `backend/app/models/classroom.py`
- Modify: `backend/app/models/__init__.py`
- Create: `backend/alembic/versions/<rev>_classrooms.py`

**Interfaces:**
- Produces: `Classroom` (id, name, section, subject, theme_color, join_code, owner_id, created_at, updated_at; relationships `owner`, `teachers`, `students`), `ClassroomTeacher` (classroom_id, user_id), `ClassroomStudent` (classroom_id, user_id, joined_at).

- [ ] **Step 1: Write the model module**

Create `backend/app/models/classroom.py`:

```python
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.user import User


class ClassroomTeacher(Base):
    __tablename__ = "classroom_teachers"
    classroom_id: Mapped[int] = mapped_column(
        ForeignKey("classrooms.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )


class ClassroomStudent(Base):
    __tablename__ = "classroom_students"
    classroom_id: Mapped[int] = mapped_column(
        ForeignKey("classrooms.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class Classroom(Base, TimestampMixin):
    __tablename__ = "classrooms"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    section: Mapped[str | None] = mapped_column(String(120), nullable=True)
    subject: Mapped[str | None] = mapped_column(String(120), nullable=True)
    theme_color: Mapped[str] = mapped_column(String(9), default="#B23A6F", nullable=False)
    join_code: Mapped[str] = mapped_column(String(12), unique=True, index=True, nullable=False)
    owner_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    owner: Mapped["User"] = relationship("User", foreign_keys=[owner_id])
    teachers: Mapped[list["User"]] = relationship(
        "User", secondary="classroom_teachers", viewonly=True
    )
    students: Mapped[list["User"]] = relationship(
        "User", secondary="classroom_students", viewonly=True
    )
```

- [ ] **Step 2: Register the models**

In `backend/app/models/__init__.py`, add the imports and `__all__` entries:

```python
from app.models.classroom import Classroom, ClassroomStudent, ClassroomTeacher
```

Add `"Classroom"`, `"ClassroomStudent"`, `"ClassroomTeacher"` to `__all__`.

- [ ] **Step 3: Autogenerate the migration**

Run: `cd backend && source .venv/bin/activate && alembic revision --autogenerate -m "classrooms"`
Expected: a new version file creating `classrooms`, `classroom_teachers`, `classroom_students`.

- [ ] **Step 4: Verify + apply**

Open the generated file; confirm `create_table` for all three (with the unique index on `classrooms.join_code`) and matching `downgrade()` drops. Then run:
`cd backend && source .venv/bin/activate && alembic upgrade head`
Expected: `Running upgrade ... classrooms`, no errors.

- [ ] **Step 5: Confirm existing tests pass + commit**

Run: `cd backend && source .venv/bin/activate && pytest -q`
Expected: all PASS.

```bash
git add backend/app/models backend/alembic/versions
git commit -m "feat(models): classroom, classroom_teachers, classroom_students tables"
```

---

### Task 2: Schemas + authz helpers

**Files:**
- Create: `backend/app/schemas/classroom.py`
- Modify: `backend/app/services/authz.py`

**Interfaces:**
- Consumes: `Classroom`, `ClassroomTeacher`, `ClassroomStudent` (Task 1).
- Produces: schemas `ClassroomCreate`, `ClassroomUpdate`, `ClassroomOut`, `ClassroomMember`, `ClassroomDetail`, `JoinRequest`, `OwnerReassign`, `TeacherAdd`; authz `is_class_teacher(db, user, classroom)`, `is_class_member(db, user, classroom)`, `ensure_class_teacher(...)`, `ensure_class_member(...)`, `is_class_owner(user, classroom)`, `ensure_class_owner(...)`.

- [ ] **Step 1: Write the schemas**

Create `backend/app/schemas/classroom.py`:

```python
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
```

- [ ] **Step 2: Write failing authz tests**

Create `backend/tests/test_classrooms.py` with an initial test (helpers reused by later tasks):

```python
from app.models.enums import UserRole
from app.services import authz


def test_authz_helpers_recognize_owner(db, make_user):
    from app.models.classroom import Classroom, ClassroomTeacher
    fac = make_user("owner@t.com", UserRole.FACULTY)
    other = make_user("nope@t.com", UserRole.FACULTY)
    db.add(Classroom(id=1, name="C", theme_color="#111111", join_code="ABC123", owner_id=fac.id))
    db.add(ClassroomTeacher(classroom_id=1, user_id=fac.id))
    db.flush()
    c = db.get(Classroom, 1)
    assert authz.is_class_teacher(db, fac, c) is True
    assert authz.is_class_teacher(db, other, c) is False
```

- [ ] **Step 3: Run to verify failure**

Run: `cd backend && source .venv/bin/activate && pytest tests/test_classrooms.py -q`
Expected: FAIL — `authz.is_class_teacher` not defined.

- [ ] **Step 4: Add authz helpers**

Append to `backend/app/services/authz.py`:

```python
from sqlalchemy import select  # add to imports at top if missing
from sqlalchemy.orm import Session

from app.models.classroom import Classroom, ClassroomStudent, ClassroomTeacher


def is_class_owner(user: User, classroom: Classroom) -> bool:
    return is_admin(user) or classroom.owner_id == user.id


def is_class_teacher(db: Session, user: User, classroom: Classroom) -> bool:
    if is_admin(user) or classroom.owner_id == user.id:
        return True
    return db.scalar(
        select(ClassroomTeacher).where(
            ClassroomTeacher.classroom_id == classroom.id,
            ClassroomTeacher.user_id == user.id,
        )
    ) is not None


def is_class_member(db: Session, user: User, classroom: Classroom) -> bool:
    if is_class_teacher(db, user, classroom):
        return True
    return db.scalar(
        select(ClassroomStudent).where(
            ClassroomStudent.classroom_id == classroom.id,
            ClassroomStudent.user_id == user.id,
        )
    ) is not None


def ensure_class_owner(user: User, classroom: Classroom) -> None:
    if not is_class_owner(user, classroom):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Owner only")


def ensure_class_teacher(db: Session, user: User, classroom: Classroom) -> None:
    if not is_class_teacher(db, user, classroom):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a teacher of this class")


def ensure_class_member(db: Session, user: User, classroom: Classroom) -> None:
    if not is_class_member(db, user, classroom):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this class")
```

- [ ] **Step 5: Run test + commit**

Run: `cd backend && source .venv/bin/activate && pytest tests/test_classrooms.py -q`
Expected: PASS.

```bash
git add backend/app/schemas/classroom.py backend/app/services/authz.py backend/tests/test_classrooms.py
git commit -m "feat(classrooms): schemas + class authorization helpers"
```

---

### Task 3: Router — create, list, get, delete, update + mount

**Files:**
- Create: `backend/app/routers/classrooms.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_classrooms.py`

**Interfaces:**
- Consumes: schemas + authz (Task 2).
- Produces: `_gen_code(db)`, `_serialize(db, c, *, with_code, with_roster)`; endpoints `POST /api/classrooms`, `GET /api/classrooms`, `GET /api/classrooms/:id`, `PUT /api/classrooms/:id`, `DELETE /api/classrooms/:id`.

- [ ] **Step 1: Write failing tests**

Add to `backend/tests/test_classrooms.py`:

```python
def _auth_hdr(client, email, pw="password123"):
    return {"Authorization": f"Bearer {client.post('/api/auth/login', json={'email': email, 'password': pw}).json()['access_token']}"}


def test_faculty_creates_class_and_lists(client, make_user):
    make_user("cf@t.com", UserRole.FACULTY)
    fac = _auth_hdr(client, "cf@t.com")
    r = client.post("/api/classrooms", json={"name": "Maths", "section": "A"}, headers=fac)
    assert r.status_code == 201
    body = r.json()
    assert body["join_code"] and body["owner_id"]
    assert body["teacher_count"] == 1
    mine = client.get("/api/classrooms", headers=fac).json()
    assert any(c["id"] == body["id"] for c in mine)


def test_student_cannot_create_class(client, make_user):
    make_user("cs@t.com", UserRole.STUDENT)
    r = client.post("/api/classrooms", json={"name": "X"}, headers=_auth_hdr(client, "cs@t.com"))
    assert r.status_code == 403
```

- [ ] **Step 2: Run to verify failure**

Run: `cd backend && source .venv/bin/activate && pytest tests/test_classrooms.py -q -k "creates or cannot_create"`
Expected: FAIL — 404 (router not mounted).

- [ ] **Step 3: Write the router**

Create `backend/app/routers/classrooms.py`:

```python
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
)
from app.services import authz

router = APIRouter(prefix="/api/classrooms", tags=["classrooms"])

Faculty = require_role(UserRole.FACULTY)
_ALPHABET = string.ascii_uppercase + string.digits


def _gen_code(db: Session) -> str:
    while True:
        code = "".join(secrets.choice(_ALPHABET) for _ in range(6))
        if db.scalar(select(Classroom).where(Classroom.join_code == code)) is None:
            return code


def _counts(db: Session, cid: int) -> tuple[int, int]:
    t = db.scalar(select(func.count()).select_from(ClassroomTeacher).where(ClassroomTeacher.classroom_id == cid))
    s = db.scalar(select(func.count()).select_from(ClassroomStudent).where(ClassroomStudent.classroom_id == cid))
    return t or 0, s or 0


def _get_or_404(db: Session, cid: int) -> Classroom:
    c = db.get(Classroom, cid)
    if c is None:
        raise HTTPException(status_code=404, detail="Classroom not found")
    return c


def _serialize(db: Session, c: Classroom, *, with_code: bool, detail: bool = False, with_roster: bool = False):
    tcount, scount = _counts(db, c.id)
    data = ClassroomOut(
        id=c.id, name=c.name, section=c.section, subject=c.subject,
        theme_color=c.theme_color, owner_id=c.owner_id,
        owner_name=c.owner.name if c.owner else None,
        teacher_count=tcount, student_count=scount,
        join_code=c.join_code if with_code else None, created_at=c.created_at,
    )
    if not detail:
        return data
    teachers = db.scalars(select(User).join(ClassroomTeacher, ClassroomTeacher.user_id == User.id).where(ClassroomTeacher.classroom_id == c.id)).all()
    students = db.scalars(select(User).join(ClassroomStudent, ClassroomStudent.user_id == User.id).where(ClassroomStudent.classroom_id == c.id)).all() if with_roster else []
    return ClassroomDetail(**data.model_dump(), teachers=[ClassroomMember.model_validate(t) for t in teachers], students=[ClassroomMember.model_validate(s) for s in students])


@router.post("", response_model=ClassroomDetail, status_code=201)
def create_classroom(payload: ClassroomCreate, db: Session = Depends(get_db), user: User = Depends(Faculty)):
    c = Classroom(
        name=payload.name, section=payload.section, subject=payload.subject,
        theme_color=payload.theme_color or "#B23A6F", join_code=_gen_code(db), owner_id=user.id,
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
        rows = db.scalars(select(Classroom).join(ClassroomTeacher, ClassroomTeacher.classroom_id == Classroom.id).where(ClassroomTeacher.user_id == user.id)).all()
        return [_serialize(db, c, with_code=True) for c in rows]
    rows = db.scalars(select(Classroom).join(ClassroomStudent, ClassroomStudent.classroom_id == Classroom.id).where(ClassroomStudent.user_id == user.id)).all()
    return [_serialize(db, c, with_code=False) for c in rows]


@router.get("/{cid}", response_model=ClassroomDetail)
def get_classroom(cid: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    c = _get_or_404(db, cid)
    authz.ensure_class_member(db, user, c)
    teacher = authz.is_class_teacher(db, user, c)
    return _serialize(db, c, with_code=teacher, detail=True, with_roster=teacher)


@router.put("/{cid}", response_model=ClassroomDetail)
def update_classroom(cid: int, payload: ClassroomUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
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
```

- [ ] **Step 4: Mount the router**

In `backend/app/main.py`, add `classrooms` to the lazy import tuple and the `include_router` loop (alongside the others).

- [ ] **Step 5: Run tests + commit**

Run: `cd backend && source .venv/bin/activate && pytest tests/test_classrooms.py -q`
Expected: PASS.

```bash
git add backend/app/routers/classrooms.py backend/app/main.py backend/tests/test_classrooms.py
git commit -m "feat(classrooms): create/list/get/update/delete router + mount"
```

---

### Task 4: Join, leave, remove student

**Files:**
- Modify: `backend/app/routers/classrooms.py`
- Test: `backend/tests/test_classrooms.py`

**Interfaces:**
- Consumes: Task 3 helpers.
- Produces: `POST /api/classrooms/join`, `DELETE /api/classrooms/:id/leave`, `DELETE /api/classrooms/:id/students/:uid`.

- [ ] **Step 1: Write failing tests**

Add to `backend/tests/test_classrooms.py`:

```python
def test_student_join_leave_and_bad_code(client, make_user):
    make_user("jf@t.com", UserRole.FACULTY)
    make_user("js@t.com", UserRole.STUDENT)
    fac, st = _auth_hdr(client, "jf@t.com"), _auth_hdr(client, "js@t.com")
    code = client.post("/api/classrooms", json={"name": "Bio"}, headers=fac).json()["join_code"]
    cid = client.post("/api/classrooms/join", json={"code": code}, headers=st).json()["id"]
    assert client.post("/api/classrooms/join", json={"code": code}, headers=st).status_code == 409
    assert client.post("/api/classrooms/join", json={"code": "ZZZZZZ"}, headers=st).status_code == 404
    # student view hides join_code + roster
    view = client.get(f"/api/classrooms/{cid}", headers=st).json()
    assert view["join_code"] is None and view["students"] == []
    assert client.delete(f"/api/classrooms/{cid}/leave", headers=st).status_code == 204


def test_teacher_removes_student(client, make_user):
    make_user("rf@t.com", UserRole.FACULTY)
    make_user("rs@t.com", UserRole.STUDENT)
    fac, st = _auth_hdr(client, "rf@t.com"), _auth_hdr(client, "rs@t.com")
    code = client.post("/api/classrooms", json={"name": "Chem"}, headers=fac).json()["join_code"]
    cid = client.post("/api/classrooms/join", json={"code": code}, headers=st).json()["id"]
    sid = client.get("/api/auth/me", headers=st).json()["id"]
    assert client.delete(f"/api/classrooms/{cid}/students/{sid}", headers=fac).status_code == 204
```

- [ ] **Step 2: Run to verify failure**

Run: `cd backend && source .venv/bin/activate && pytest tests/test_classrooms.py -q -k "join_leave or removes_student"`
Expected: FAIL (routes 404/405).

- [ ] **Step 3: Add the endpoints**

Append to `backend/app/routers/classrooms.py` (before or after existing routes; `/join` must be declared so it is not shadowed by `/{cid}` — FastAPI matches `/join` as a literal before the int converter, but to be safe declare it above `get_classroom`):

```python
from app.schemas.classroom import JoinRequest  # add to imports

Student = require_role(UserRole.STUDENT)


@router.post("/join", response_model=ClassroomDetail)
def join_classroom(payload: JoinRequest, db: Session = Depends(get_db), user: User = Depends(Student)):
    c = db.scalar(select(Classroom).where(Classroom.join_code == payload.code.upper()))
    if c is None:
        raise HTTPException(status_code=404, detail="Invalid class code")
    exists = db.scalar(select(ClassroomStudent).where(ClassroomStudent.classroom_id == c.id, ClassroomStudent.user_id == user.id))
    if exists:
        raise HTTPException(status_code=409, detail="Already enrolled")
    db.add(ClassroomStudent(classroom_id=c.id, user_id=user.id))
    db.commit()
    return _serialize(db, c, with_code=False, detail=True, with_roster=False)


@router.delete("/{cid}/leave", status_code=204)
def leave_classroom(cid: int, db: Session = Depends(get_db), user: User = Depends(Student)):
    row = db.scalar(select(ClassroomStudent).where(ClassroomStudent.classroom_id == cid, ClassroomStudent.user_id == user.id))
    if row is None:
        raise HTTPException(status_code=404, detail="You are not in this class")
    db.delete(row)
    db.commit()


@router.delete("/{cid}/students/{uid}", status_code=204)
def remove_student(cid: int, uid: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    c = _get_or_404(db, cid)
    authz.ensure_class_teacher(db, user, c)
    row = db.scalar(select(ClassroomStudent).where(ClassroomStudent.classroom_id == cid, ClassroomStudent.user_id == uid))
    if row is None:
        raise HTTPException(status_code=404, detail="Student not in class")
    db.delete(row)
    db.commit()
```

Ensure `join_classroom` is defined **above** `get_classroom` in the file so the literal `/join` route registers before `/{cid}`.

- [ ] **Step 4: Run tests + commit**

Run: `cd backend && source .venv/bin/activate && pytest tests/test_classrooms.py -q`
Expected: PASS.

```bash
git add backend/app/routers/classrooms.py backend/tests/test_classrooms.py
git commit -m "feat(classrooms): join by code, leave, remove student"
```

---

### Task 5: Co-teachers, owner reassign, regenerate code, admin list

**Files:**
- Modify: `backend/app/routers/classrooms.py`
- Modify: `backend/app/routers/admin.py`
- Test: `backend/tests/test_classrooms.py`

**Interfaces:**
- Produces: `POST /api/classrooms/:id/teachers`, `DELETE /api/classrooms/:id/teachers/:uid`, `PATCH /api/classrooms/:id/owner`, `POST /api/classrooms/:id/regenerate-code`, and `GET /api/admin/classrooms`.

- [ ] **Step 1: Write failing tests**

Add to `backend/tests/test_classrooms.py`:

```python
def test_coteacher_add_remove_and_owner_guard(client, make_user):
    make_user("of@t.com", UserRole.FACULTY)
    make_user("co@t.com", UserRole.FACULTY)
    make_user("stu@t.com", UserRole.STUDENT)
    owner = _auth_hdr(client, "of@t.com")
    cid = client.post("/api/classrooms", json={"name": "Phys"}, headers=owner).json()["id"]
    co_id = client.get("/api/auth/me", headers=_auth_hdr(client, "co@t.com")).json()["id"]
    stu_id = client.get("/api/auth/me", headers=_auth_hdr(client, "stu@t.com")).json()["id"]
    assert client.post(f"/api/classrooms/{cid}/teachers", json={"user_id": co_id}, headers=owner).status_code == 200
    # student cannot be a co-teacher
    assert client.post(f"/api/classrooms/{cid}/teachers", json={"user_id": stu_id}, headers=owner).status_code == 400
    owner_id = client.get("/api/auth/me", headers=owner).json()["id"]
    # cannot remove the owner as a teacher
    assert client.delete(f"/api/classrooms/{cid}/teachers/{owner_id}", headers=owner).status_code == 400
    assert client.delete(f"/api/classrooms/{cid}/teachers/{co_id}", headers=owner).status_code == 204


def test_admin_lists_all_classrooms(client, make_user):
    make_user("af@t.com", UserRole.FACULTY)
    make_user("aad@t.com", UserRole.ADMIN)
    fac, adm = _auth_hdr(client, "af@t.com"), _auth_hdr(client, "aad@t.com")
    client.post("/api/classrooms", json={"name": "Hist"}, headers=fac)
    rows = client.get("/api/admin/classrooms", headers=adm).json()
    assert any(c["name"] == "Hist" and c["owner_name"] for c in rows)
```

- [ ] **Step 2: Run to verify failure**

Run: `cd backend && source .venv/bin/activate && pytest tests/test_classrooms.py -q -k "coteacher or admin_lists"`
Expected: FAIL.

- [ ] **Step 3: Add classroom endpoints**

Append to `backend/app/routers/classrooms.py`:

```python
from app.schemas.classroom import OwnerReassign, TeacherAdd  # add to imports


@router.post("/{cid}/teachers", response_model=ClassroomDetail)
def add_teacher(cid: int, payload: TeacherAdd, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    c = _get_or_404(db, cid)
    authz.ensure_class_owner(user, c)
    target = db.get(User, payload.user_id)
    if target is None or target.role != UserRole.FACULTY:
        raise HTTPException(status_code=400, detail="Co-teacher must be a faculty user")
    if db.scalar(select(ClassroomTeacher).where(ClassroomTeacher.classroom_id == cid, ClassroomTeacher.user_id == target.id)):
        raise HTTPException(status_code=409, detail="Already a teacher")
    db.add(ClassroomTeacher(classroom_id=cid, user_id=target.id))
    db.commit()
    return _serialize(db, c, with_code=True, detail=True, with_roster=True)


@router.delete("/{cid}/teachers/{uid}", status_code=204)
def remove_teacher(cid: int, uid: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    c = _get_or_404(db, cid)
    authz.ensure_class_owner(user, c)
    if uid == c.owner_id:
        raise HTTPException(status_code=400, detail="Cannot remove the owner")
    row = db.scalar(select(ClassroomTeacher).where(ClassroomTeacher.classroom_id == cid, ClassroomTeacher.user_id == uid))
    if row is None:
        raise HTTPException(status_code=404, detail="Not a teacher")
    db.delete(row)
    db.commit()


@router.patch("/{cid}/owner", response_model=ClassroomDetail)
def reassign_owner(cid: int, payload: OwnerReassign, db: Session = Depends(get_db), user: User = Depends(require_role(UserRole.ADMIN))):
    c = _get_or_404(db, cid)
    target = db.get(User, payload.user_id)
    if target is None or target.role != UserRole.FACULTY:
        raise HTTPException(status_code=400, detail="Owner must be a faculty user")
    c.owner_id = target.id
    if not db.scalar(select(ClassroomTeacher).where(ClassroomTeacher.classroom_id == cid, ClassroomTeacher.user_id == target.id)):
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
```

- [ ] **Step 4: Add the admin oversight list**

In `backend/app/routers/admin.py`, add an endpoint returning all classrooms with owner + counts. Reuse the classrooms serializer:

```python
from app.models.classroom import Classroom  # add near other imports
from app.routers.classrooms import _serialize as _serialize_classroom  # reuse
from app.schemas.classroom import ClassroomOut


@router.get("/classrooms", response_model=list[ClassroomOut])
def admin_list_classrooms(db: Session = Depends(get_db), user: User = Depends(AdminOnly)):
    rows = db.scalars(select(Classroom)).all()
    return [_serialize_classroom(db, c, with_code=True) for c in rows]
```

(If `admin.py` lacks `select`/`Session`/`AdminOnly` in scope, add the imports to match the file's existing style.)

- [ ] **Step 5: Run full backend suite + commit**

Run: `cd backend && source .venv/bin/activate && pytest -q`
Expected: all PASS.

```bash
git add backend/app/routers/classrooms.py backend/app/routers/admin.py backend/tests/test_classrooms.py
git commit -m "feat(classrooms): co-teachers, owner reassign, code regen, admin oversight list"
```

---

### Task 6: Frontend API wrapper + ClassCard

**Files:**
- Create: `frontend/src/api/classrooms.js`
- Modify: `frontend/src/api/index.js`
- Create: `frontend/src/components/classroom/ClassCard.jsx`

**Interfaces:**
- Produces: `classroomsApi` with all endpoint methods; `<ClassCard classroom footer to />`.

- [ ] **Step 1: Write the API wrapper**

Create `frontend/src/api/classrooms.js`:

```js
import { api } from "./client";
export const classroomsApi = {
  list: () => api.get("/classrooms").then((r) => r.data),
  get: (id) => api.get(`/classrooms/${id}`).then((r) => r.data),
  create: (payload) => api.post("/classrooms", payload).then((r) => r.data),
  update: (id, payload) => api.put(`/classrooms/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/classrooms/${id}`).then((r) => r.data),
  join: (code) => api.post("/classrooms/join", { code }).then((r) => r.data),
  leave: (id) => api.delete(`/classrooms/${id}/leave`).then((r) => r.data),
  regenerateCode: (id) => api.post(`/classrooms/${id}/regenerate-code`).then((r) => r.data),
  addTeacher: (id, user_id) => api.post(`/classrooms/${id}/teachers`, { user_id }).then((r) => r.data),
  removeTeacher: (id, uid) => api.delete(`/classrooms/${id}/teachers/${uid}`).then((r) => r.data),
  removeStudent: (id, uid) => api.delete(`/classrooms/${id}/students/${uid}`).then((r) => r.data),
  reassignOwner: (id, user_id) => api.patch(`/classrooms/${id}/owner`, { user_id }).then((r) => r.data),
  adminList: () => api.get("/admin/classrooms").then((r) => r.data),
};
```

Add `export { classroomsApi } from "./classrooms";` to `frontend/src/api/index.js` (match the file's existing export style).

- [ ] **Step 2: Write ClassCard**

Create `frontend/src/components/classroom/ClassCard.jsx` — Google-Classroom card: colored header band using `classroom.theme_color`, class name + section, a body slot, and a footer actions slot.

```jsx
import { Link } from "react-router-dom";

export default function ClassCard({ classroom, to, footer, children }) {
  const inner = (
    <div className="bg-card border border-ink/15 rounded-sm overflow-hidden flex flex-col h-full">
      <div className="h-24 p-4 text-white flex flex-col justify-between" style={{ backgroundColor: classroom.theme_color || "#B23A6F" }}>
        <h3 className="font-semibold text-lg leading-tight line-clamp-2">{classroom.name}</h3>
        {classroom.section && <p className="text-xs opacity-90">{classroom.section}</p>}
      </div>
      <div className="p-4 text-sm text-ink/70 flex-1">{children}</div>
      {footer && <div className="border-t border-ink/10 px-4 py-2 flex items-center justify-end gap-3">{footer}</div>}
    </div>
  );
  return to ? <Link to={to} className="block h-full">{inner}</Link> : inner;
}
```

- [ ] **Step 3: Build check + commit**

Run: `cd frontend && npm run build`
Expected: build succeeds.

```bash
git add frontend/src/api/classrooms.js frontend/src/api/index.js frontend/src/components/classroom/ClassCard.jsx
git commit -m "feat(frontend): classrooms api wrapper + ClassCard component"
```

---

### Task 7: Faculty MyClasses + Classroom detail

**Files:**
- Create: `frontend/src/pages/faculty/MyClasses.jsx`
- Create: `frontend/src/pages/classroom/ClassroomDetail.jsx`

**Interfaces:**
- Consumes: `classroomsApi`, `ClassCard`, `usersApi` (to pick a co-teacher), UI kit, `useAuth`.

- [ ] **Step 1: Faculty MyClasses page**

Create `frontend/src/pages/faculty/MyClasses.jsx`: fetch `classroomsApi.list()`; render a responsive grid of `<ClassCard to={"/classes/"+c.id}>` showing `student_count` students + the join code; a "Create class" button opens a `Modal` with fields name/section/subject and a color picker (6 swatches from a palette array `["#B23A6F","#4A5568","#2B6CB0","#2F855A","#B7791F","#6B46C1"]`). On submit call `classroomsApi.create` and refresh. Use existing `Card`, `Button`, `Modal`, `Input`, `EmptyState`, `Spinner`.

- [ ] **Step 2: Classroom detail page (teacher + student views)**

Create `frontend/src/pages/classroom/ClassroomDetail.jsx`: fetch `classroomsApi.get(id)` and `useAuth()`. Colored header (theme_color) with name/section. If the response includes `join_code` (teacher/admin), show: join code with a "Regenerate" button (`regenerateCode`), a teachers list with add-co-teacher (a small picker: fetch faculty via `usersApi.list({role:"FACULTY"})`, choose one, `addTeacher`; remove via `removeTeacher` except the owner), and the student roster with a remove (`removeStudent`) action; a Delete-class button for owner/admin (`remove` → navigate back). If no `join_code` (student view), show the teacher names, classmate count (`student_count`), and a "Leave class" button (`leave` → navigate to `/classes`). Reuse UI kit; guard actions by presence of `join_code` / `owner_id === user.id`.

- [ ] **Step 3: Build check + commit**

Run: `cd frontend && npm run build`
Expected: succeeds (routes wired in Task 8; components compile).

```bash
git add frontend/src/pages/faculty/MyClasses.jsx frontend/src/pages/classroom/ClassroomDetail.jsx
git commit -m "feat(frontend): faculty MyClasses + classroom detail"
```

---

### Task 8: Student MyClasses, Admin Classrooms, routes + sidebar

**Files:**
- Create: `frontend/src/pages/student/MyClasses.jsx`
- Create: `frontend/src/pages/admin/Classrooms.jsx`
- Modify: `frontend/src/router.jsx`
- Modify: `frontend/src/components/layout/Sidebar.jsx`

**Interfaces:**
- Consumes: `classroomsApi`, `ClassCard`, UI kit.

- [ ] **Step 1: Student MyClasses**

Create `frontend/src/pages/student/MyClasses.jsx`: fetch `classroomsApi.list()`; grid of `<ClassCard to={"/classes/"+c.id}>` (show teacher/owner name + `student_count` classmates). A "Join class" button opens a `Modal` with a code `Input`; submit `classroomsApi.join(code)` then navigate to `/classes/:id` (handle 404/409 with the toast store). Empty state prompts to join.

- [ ] **Step 2: Admin Classrooms**

Create `frontend/src/pages/admin/Classrooms.jsx`: fetch `classroomsApi.adminList()`; render a `Table` of all classes (name, owner_name, teacher_count, student_count) with a "View" link to `/classes/:id`; each row has Delete (`remove`) and Reassign-owner (Modal picking a FACULTY user via `usersApi.list({role:"FACULTY"})` → `reassignOwner`). Reuse UI kit.

- [ ] **Step 3: Wire routes**

In `frontend/src/router.jsx`: import the three pages + `ClassroomDetail`. Add `{ path: "/faculty/classes", element: <MyClassesFaculty /> }` to the FACULTY block, `{ path: "/classes", element: <MyClassesStudent /> }` to the STUDENT block, `{ path: "/admin/classes", element: <AdminClassrooms /> }` to the ADMIN block, and a **shared** `{ path: "/classes/:id", element: <ClassroomDetail /> }` placed directly under the `AppLayout` children (outside the per-role `RoleRoute` blocks) so all roles can open it — the backend enforces membership.

- [ ] **Step 4: Add sidebar links**

In `frontend/src/components/layout/Sidebar.jsx`, add to `NAV`: STUDENT `["/classes", "Classes"]`, FACULTY `["/faculty/classes", "Classes"]`, ADMIN `["/admin/classes", "Classes"]`.

- [ ] **Step 5: Build check + commit**

Run: `cd frontend && npm run build`
Expected: succeeds.

```bash
git add frontend/src/pages/student/MyClasses.jsx frontend/src/pages/admin/Classrooms.jsx frontend/src/router.jsx frontend/src/components/layout/Sidebar.jsx
git commit -m "feat(frontend): student join, admin classrooms, routes + sidebar Classes"
```

---

## Final verification

- [ ] `cd backend && source .venv/bin/activate && pytest -q` — all green.
- [ ] `cd frontend && npm run build` — succeeds.
- [ ] Manual smoke (backend + frontend, seeded data): faculty creates a class → copies join code; a second faculty is added as co-teacher; a student joins by code and sees the card; student opens detail (no code/roster, can leave); faculty sees roster and can remove a student; admin sees all classes and can reassign owner / delete.
- [ ] Update `FUTURE_WORK.md`: tick the class/enrollment items delivered by this slice (Class/section entity; faculty own classes; student enrollment) and note quiz-to-class assignment (slice B) still pending; commit.
</content>
