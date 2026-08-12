# Quiz Assignment + Home + To-Do (Slices B/C/D) — Design

**Date:** 2026-08-12
**Status:** Approved — implementing
**Depends on:** Classrooms slice A (complete), Assessment Engine v2 (complete).
**Builds:** B quiz→classroom assignment, C class-cards home, D student to-do/pending.

## Overview

Quizzes need no classroom to exist. A quiz is **open-to-all** (today's behavior) or
**assigned** to one-or-more classrooms, each targeting the whole class or a selected
subset of students. Students discover and may attempt only quizzes that are open or
assigned to them. The role home becomes a grid of class cards; students get a to-do
list of pending assessments with a topbar badge.

## Decisions (locked)

- **Multi-class + per-class targeting.** A quiz has `visibility` = OPEN | ASSIGNED;
  ASSIGNED quizzes carry one-or-more assignments, each a classroom + whole-class or a
  selected student subset.
- **Assign from the quiz** (My Quizzes → Assign); visibility also set on the quiz form.
- **Home = class cards + to-do.** `/` (student) and `/faculty` become Home; quiz Browse
  moves to `/browse`; faculty Dashboard moves to `/faculty/dashboard`.
- **Pending reuses the quiz availability window** (`available_from`/`available_until`);
  no new date field.

## Data Model

New enum `QuizVisibility` (`OPEN`, `ASSIGNED`) in `app/models/enums.py`.

**quizzes** — add `visibility: QuizVisibility` (default `OPEN`, not null).

**quiz_assignments**
- `id`, `quiz_id` FK→quizzes (CASCADE), `classroom_id` FK→classrooms (CASCADE),
  `whole_class` bool (default true), `created_at`.
- A quiz may have at most one assignment per classroom (unique `(quiz_id, classroom_id)`).

**quiz_assignment_students**
- `assignment_id` FK→quiz_assignments (CASCADE), `user_id` FK→users (CASCADE).
- Composite PK `(assignment_id, user_id)`. Only populated when `whole_class = false`.

One Alembic migration adds the column + two tables. Existing quizzes default to `OPEN`
— zero behavior change for current data. Register models in `app/models/__init__.py`.

## Access & Discovery (the dataflow spine)

Add `services/assignments.py` with the single source of truth:

- `assigned_quiz_ids(db, user) -> set[int]` — quiz ids assigned to this student:
  quizzes with an assignment whose `classroom_id` is a class the student is enrolled in
  **and** (`whole_class` **or** a `quiz_assignment_students` row for the student).
- `student_can_access(db, user, quiz) -> bool` — `quiz.status == PUBLISHED` **and**
  (`quiz.visibility == OPEN` **or** `quiz.id in assigned_quiz_ids`).

Wire it in `routers/quizzes.py` and `routers/attempts.py`:
- `GET /quizzes` (student): return PUBLISHED quizzes where OPEN **or** id ∈ assigned set.
- `GET /quizzes/:id` (student): 404 unless `student_can_access`.
- `POST /quizzes/:id/start`: 403 "This quiz is not assigned to you" unless
  `student_can_access` (in addition to the existing schedule/max-attempt gates).

Faculty/admin visibility is unchanged (own/all).

## Endpoints (B)

- `GET /api/quizzes/:id/assignments` (owner/admin) → `{visibility, assignments:[{id,
  classroom_id, classroom_name, whole_class, student_ids:[...]}]}`.
- `PUT /api/quizzes/:id/assignments` (owner/admin) — body `AssignmentSet`
  `{visibility, assignments:[{classroom_id, whole_class, student_ids?}]}`. Replaces the
  whole set transactionally. `visibility == OPEN` clears all assignments. Validation:
  each `classroom_id` must be a class the caller teaches (admin: any); each
  `student_id` must be enrolled in that classroom; `whole_class=false` requires ≥1
  student. Returns the same shape as GET.
- `QuizDetail` (in `schemas/quiz.py`) gains `visibility` and `assignment_count`.

`GET /api/assignments/todo` (student) → `list[TodoItem]` `{quiz_id, quiz_title,
classroom_name, available_until, attempts_used, max_attempts}` for every **pending**
assessment: PUBLISHED + assigned-to-me + within window (now ≥ available_from or none;
now ≤ available_until or none) + not yet completed (no PASSED/FAILED attempt) +
attempts_used < max_attempts. Lives in a new `routers/assignments.py` (prefix `/api`).

## Schemas

`schemas/assignment.py`:
- `AssignmentItem` {classroom_id:int, whole_class:bool=true, student_ids:list[int]=[]}.
- `AssignmentSet` {visibility:QuizVisibility, assignments:list[AssignmentItem]=[]}.
- `AssignmentView` {id, classroom_id, classroom_name, whole_class, student_ids:list[int]}.
- `QuizAssignments` {visibility, assignments:list[AssignmentView]}.
- `TodoItem` {quiz_id, quiz_title, classroom_name:str|None, available_until:datetime|None,
  attempts_used:int, max_attempts:int}.

## Frontend

**API wrappers**
- `api/quizzes.js`: add `getAssignments(id)`, `setAssignments(id, payload)`.
- `api/assignments.js` (new): `todo()` → `GET /assignments/todo`. Export via `api/index.js`.

**Assignment UI (B)**
- `QuizForm`: a **Visibility** control (Open to all / Assign to classes). Choosing
  "Assign" reveals a note that targeting is done via the Assign dialog after save.
- `pages/faculty/MyQuizzes.jsx`: an **Assign** action per quiz opens
  `components/quiz/AssignDialog.jsx` — lists the faculty's classes (from
  `classroomsApi.list()`); per selected class a toggle *whole class* vs *pick students*,
  and when picking, the class roster (from `classroomsApi.get(classId)`) with each
  student's avg score shown (fetched from admin/attempts is overkill — show name/email;
  avg score optional if already present). Saves via `quizzesApi.setAssignments`.

**Home (C)**
- `pages/student/Home.jsx` at `/`: grid of `ClassCard`s (`classroomsApi.list()`), each
  card footing a **pending count** for that class (derived from the to-do list grouped by
  classroom_name); plus a **To-do panel** (below/aside) listing pending assessments with
  due date and a "Start" link to the quiz. A link to `/browse` for open quizzes.
- `pages/faculty/Home.jsx` at `/faculty`: grid of `ClassCard`s (classes taught) with
  student counts and a link into each class + to My Quizzes.
- Move Browse to `/browse`; move faculty Dashboard to `/faculty/dashboard`. Update
  `router.jsx`, `Sidebar.jsx` (Student: Home, Browse, Classes, My Attempts, Leaderboard,
  Dashboard; Faculty: Home, Dashboard, My Quizzes, Classes, AI Generate), and any
  internal links that pointed at `/` for Browse or `/faculty` for Dashboard.

**To-do badge (D)**
- `components/layout/Topbar.jsx`: for students, fetch `assignmentsApi.todo()` on mount and
  show a small badge with the pending count (0 → no badge). Reused by Home.

## Testing

pytest (`backend/tests/test_assignments.py`, new; existing suites stay green):
- open quiz visible to any student; assigned quiz hidden from a non-enrolled student.
- whole-class assignment visible to enrolled students; selected-subset visible only to
  listed students; non-targeted enrolled student cannot `GET` or `start` (403 on start).
- `PUT assignments` rejects a classroom the faculty doesn't teach and a student not in the
  class; `visibility=OPEN` clears assignments.
- `todo` lists a pending assigned quiz and omits it after the student completes it (and
  when outside the availability window).

Frontend: `npm run build` + manual smoke — faculty assigns a quiz to a class (whole +
selected); targeted vs non-targeted students; student Home shows class cards + to-do +
badge; Browse still shows open quizzes.

## Build Order (backend first)

1. Enum + `visibility` column + two tables + migration; register models; apply.
2. Schemas + `services/assignments.py` (access helpers).
3. Assignment endpoints (`GET`/`PUT`) + `QuizDetail` fields; validation.
4. Wire student access into quizzes list/get + attempt start; to-do endpoint. pytest.
5. Frontend API wrappers; QuizForm visibility + AssignDialog on My Quizzes.
6. Student Home + Browse move; faculty Home + Dashboard move; routes + sidebar.
7. To-do panel + topbar badge; manual smoke.
</content>
