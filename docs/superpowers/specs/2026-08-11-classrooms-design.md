# Classrooms & Enrollment (Slice A) — Design

**Date:** 2026-08-11
**Status:** Approved — implementing
**Depends on:** MVP + Assessment Engine v2 (complete).
**Part of:** the Google-Classroom feature set. Later slices (own specs): B quiz→classroom
assignment, C home big-cards page, D to-do/notifications, E email-verified signup + role-lock.

## Overview

Add Google-Classroom-style classrooms. A faculty creates a classroom and gets a
join code; students self-enroll with the code. Classrooms can have co-teachers.
Admin has full oversight of every classroom and its members. This slice delivers
the classroom/enrollment data model, the API, and the management UI (including the
reusable Google-Classroom card component). It does **not** wire quizzes to classes,
build the home big-cards page, or add to-do/notifications — those are later slices.

## Decisions (locked)

- Faculty create classrooms; students join by code (Google-Classroom style).
- Admin has **full oversight**: view all classrooms + members; edit/delete any;
  reassign owner.
- **Co-teachers** allowed: many faculty per classroom via a teacher join table;
  the creator is the owner.
- Students self-enroll by code and may **leave**; teachers/admin may **remove** a
  student.

## Data Model (3 new tables)

**classrooms**
- `id`, `name` (required), `section` (nullable), `subject` (nullable),
  `theme_color` (hex string, e.g. `#B23A6F`; auto-assigned from a rotating palette
  at create, editable), `join_code` (unique, 6-char A–Z0–9), `owner_id` FK→users
  (must be FACULTY), `created_at`, `updated_at`.

**classroom_teachers** (owner + co-teachers; owner also has a row here)
- `classroom_id` FK→classrooms (CASCADE), `user_id` FK→users (CASCADE).
- Composite PK `(classroom_id, user_id)`. Every listed user must be FACULTY.

**classroom_students**
- `classroom_id` FK→classrooms (CASCADE), `user_id` FK→users (CASCADE),
  `joined_at`. Composite PK `(classroom_id, user_id)`. Every listed user must be
  STUDENT.

SQLAlchemy relationships: `Classroom.owner`, `Classroom.teachers` (association to
User via classroom_teachers), `Classroom.students` (via classroom_students). One
Alembic migration creates all three tables.

## Authorization (`services/authz.py`)

Add helpers:
- `is_class_teacher(user, classroom, db) -> bool` — True if `user.role == ADMIN`,
  `classroom.owner_id == user.id`, or a `classroom_teachers` row exists.
- `is_class_member(user, classroom, db) -> bool` — teacher (above) or an enrolled
  `classroom_students` row.
- `ensure_class_teacher(...)` / `ensure_class_member(...)` — raise 403 otherwise.

Owner-only actions (delete, reassign owner, add/remove co-teacher, regenerate
code) check `classroom.owner_id == user.id or user.role == ADMIN`.

## Schemas (`schemas/classroom.py`)

- `ClassroomCreate` {name, section?, subject?, theme_color?}.
- `ClassroomUpdate` {name?, section?, subject?, theme_color?}.
- `ClassroomOut` {id, name, section, subject, theme_color, join_code, owner_id,
  owner_name, teacher_count, student_count, created_at}. `join_code` is included
  only for teachers/admin (see endpoints); serialize per-caller.
- `ClassroomMember` {id, name, email}.
- `ClassroomDetail` extends `ClassroomOut` with `teachers: list[ClassroomMember]`
  and `students: list[ClassroomMember]` (students omitted/empty for the
  student-facing view; classmate count still available via `student_count`).
- `JoinRequest` {code: str}.
- `OwnerReassign` {user_id: int}.
- `TeacherAdd` {user_id: int}.

## Endpoints (`routers/classrooms.py`, prefix `/api`)

- `POST /classrooms` (FACULTY) → create; generate unique `join_code`; set owner;
  insert owner into classroom_teachers. 201 `ClassroomDetail`.
- `GET /classrooms` → role-scoped list of `ClassroomOut`:
  FACULTY = classes they teach (owner or co-teacher); STUDENT = classes they're
  enrolled in; ADMIN = all. `join_code` present only for FACULTY/ADMIN.
- `GET /classrooms/:id` → `ClassroomDetail`. Teachers/admin get full roster +
  join_code; enrolled students get class + teacher list + `student_count` (no
  roster, no join_code). Non-members → 403.
- `PUT /classrooms/:id` (owner/admin) → edit name/section/subject/theme_color.
- `DELETE /classrooms/:id` (owner/admin) → 204.
- `PATCH /classrooms/:id/owner` (ADMIN) `OwnerReassign` → new owner must be
  FACULTY; ensure they have a teacher row.
- `POST /classrooms/:id/regenerate-code` (owner/admin) → new unique code.
- `POST /classrooms/:id/teachers` (owner/admin) `TeacherAdd` → add co-teacher
  (must be FACULTY; 409 if already a teacher).
- `DELETE /classrooms/:id/teachers/:uid` (owner/admin) → remove co-teacher;
  cannot remove the owner (400).
- `POST /classrooms/join` (STUDENT) `JoinRequest` → enroll by code; 404 bad code,
  409 already enrolled. Returns `ClassroomDetail` (student view).
- `DELETE /classrooms/:id/leave` (STUDENT) → 204; 404 if not enrolled.
- `DELETE /classrooms/:id/students/:uid` (teacher/admin) → remove a student; 204.
- `GET /admin/classrooms` (ADMIN) → all classrooms with `owner_name`,
  `teacher_count`, `student_count` (feeds the oversight dashboard).

Join-code generation: 6 chars from `A–Z0–9`, regenerate on collision.

Mount the router in `app/main.py`. Register models so Alembic sees them.

## Frontend

**API wrapper** `src/api/classrooms.js`: `list`, `get(id)`, `create`, `update`,
`remove`, `join(code)`, `leave(id)`, `regenerateCode(id)`, `addTeacher(id, uid)`,
`removeTeacher(id, uid)`, `removeStudent(id, uid)`, `reassignOwner(id, uid)`,
`adminList()`. Add to `src/api/index.js`.

**`components/classroom/ClassCard.jsx`** — the Google-Classroom card: colored
header band (`theme_color`) with class name + section, body area, footer actions
(open, plus teacher/admin extras). Reused on Home in slice C. Props:
`{classroom, to, footer}`.

**Pages**
- `pages/faculty/MyClasses.jsx` — card grid of taught classes + "Create class"
  modal (name, section, subject, color picker from the palette).
- `pages/classroom/ClassroomDetail.jsx` — colored header; teacher view shows
  join code (with "Regenerate"), co-teacher list (add by picking a FACULTY user /
  remove), student roster (remove); student view is read-only (teachers + classmate
  count + "Leave class").
- `pages/student/MyClasses.jsx` — enrolled cards + "Join class" (enter code).
- `pages/admin/Classrooms.jsx` — all classes with owner + counts; open members;
  edit / delete / reassign owner.

**Routing & nav:** add routes for the above; add a **"Classes"** sidebar item for
all three roles (faculty→/faculty/classes, student→/classes, admin→/admin/classes).

Follow the existing boxy Tailwind UI kit and axios client patterns.

## Testing

pytest (`backend/tests/test_classrooms.py`, new):
- faculty creates a class (owner + teacher row created, join_code returned);
- student joins by code; bad code → 404; duplicate join → 409;
- student leaves; teacher removes a student;
- add co-teacher (FACULTY-only; non-faculty → 400/409); remove co-teacher; cannot
  remove owner;
- owner/admin can delete; non-teacher faculty cannot manage another's class (403);
- admin sees all via `GET /classrooms` and `GET /admin/classrooms`;
- student cannot create a class (403); `join_code` hidden from the student view.

Existing suites must stay green. Frontend: manual smoke — faculty creates a class,
copies the code; student joins; both see the card; co-teacher add; admin oversight.

## Captured for Slice B (quiz assignment) — not built here

A quiz needs **no** classroom to exist. When a faculty creates/publishes a quiz,
its audience is one of:
1. **Open-to-all** — any student can discover/attempt (today's behavior).
2. **Whole class** — assigned to every student enrolled in a chosen classroom.
3. **Selected members** — assigned to a faculty-picked subset of a classroom's
   students (differentiated assignment: harder/easier sets by prior performance,
   targeted remediation/enrichment).

Slice B will model this (likely a `quiz_assignments` table + an audience flag on the
quiz) and change student discovery to: open-to-all ∪ quizzes assigned to me. This
note only preserves the requirement; Slice A builds classrooms/enrollment only.

## Build Order (backend first)

1. Models + one Alembic migration (3 tables); apply to dev DB.
2. Schemas + authz helpers.
3. Router (CRUD, join/leave, teachers, admin list) + mount; pytest.
4. API wrapper + `ClassCard`.
5. Faculty MyClasses + create modal; Classroom detail (teacher + student views).
6. Student MyClasses + join; Admin Classrooms.
7. Routes + sidebar "Classes"; manual smoke.
</content>
