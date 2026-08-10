# Quiz Management & Online Assessment Platform — Design

**Date:** 2026-08-10
**Status:** Approved — implementing Core MVP
**Source spec:** `Python - Quiz Management & Online Assessment Platform-1.pdf` (36 pages)

## Overview

A full-stack web application for online quizzes and assessments with **three roles**:

- **Admin** — runs the platform: manages all users (including creating/approving faculty), categories, platform-wide analytics; can oversee all quizzes.
- **Faculty/Teacher** — creates and manages *their own* quizzes and questions, uses AI to auto-generate questions from PDF material or syllabus topics, publishes/unpublishes their quizzes, views results/analytics for their own quizzes.
- **Student** — discovers quizzes, attempts them under a timer, views results, reviews answers, tracks performance, sees the leaderboard.

**Critical trust rule:** all trust-sensitive logic (correct answers, scoring, role checks, attempt eligibility, timer expiry) lives on the backend. The frontend never receives `is_correct` during an attempt and never computes scores.

## Tech Stack

- **Backend:** Python 3, FastAPI, SQLAlchemy, Alembic, Pydantic, python-jose (JWT), passlib/bcrypt, pypdf.
- **AI:** **Mistral API** (via `mistralai` client), key in backend env only.
- **Database:** PostgreSQL (local instance running on :5432).
- **Frontend:** React (Vite), Tailwind CSS, React Router, Axios, Recharts, React Hook Form.
- **Testing:** pytest (backend).

## Design Direction (UI)

- Palette: **pale violet** accents (`#B9A7E0` / `#8B7BB8`) on **off-white** surfaces (`#F7F5F2` / `#FFFFFF`), ink `#2B2740`.
- **Boxy UI:** square-ish cards with defined 1px borders, minimal radius, structured tables, consistent spacing, neat grid layouts.
- Reusable UI kit: `Card`, `Button`, `Input`, `Select`, `Table`, `Stat`, `Badge`, `Modal`.

## Repository Layout

```
quizzz/
├─ backend/
│  ├─ app/
│  │  ├─ main.py               app factory, CORS, router mounting
│  │  ├─ core/                 config (env), security (JWT, hashing), deps (RBAC)
│  │  ├─ db/                   session, base
│  │  ├─ models/               user, category, quiz, question, option, attempt, answer, ai_generation_job
│  │  ├─ schemas/              Pydantic request/response models
│  │  ├─ routers/              auth, users, categories, quizzes, questions, attempts, admin, leaderboard, ai
│  │  ├─ services/             scoring, timer, analytics, ai_service (Mistral), pdf_extract
│  │  └─ seed.py               bootstrap admin + sample data
│  ├─ alembic/                 migrations
│  ├─ tests/                   pytest
│  ├─ requirements.txt
│  └─ .env.example
├─ frontend/
│  └─ src/
│     ├─ api/                  axios client + endpoint wrappers
│     ├─ auth/                 context, ProtectedRoute, role guards
│     ├─ components/           boxy UI kit
│     ├─ pages/                admin/*, faculty/*, student/*, auth/*
│     └─ theme/                tailwind tokens
├─ docs/superpowers/specs/
└─ FUTURE_WORK.md
```

## Data Model

- **users**: id, name, email (unique), password_hash, role (ADMIN|FACULTY|STUDENT), status (ACTIVE|INACTIVE), created_at.
- **categories**: id, name, description, created_at.
- **quizzes**: id, title, description, category_id FK, created_by FK(users), class_level, difficulty, duration_minutes, passing_score, max_attempts, status (DRAFT|PUBLISHED|UNPUBLISHED), thumbnail_url, created_at, updated_at.
- **questions**: id, quiz_id FK, question_text, marks, explanation, difficulty, source (MANUAL|AI), created_at.
- **options**: id, question_id FK, option_text, is_correct.
- **attempts**: id, quiz_id FK, user_id FK, score, percentage, correct_answers, incorrect_answers, unanswered, time_taken, status (IN_PROGRESS|PASSED|FAILED), started_at, completed_at.
- **answers**: id, attempt_id FK, question_id FK, selected_option_id FK (nullable), is_correct.
- **ai_generation_jobs**: id, faculty_id FK, quiz_id FK (nullable), mode (PDF|TOPIC), inputs (JSON: topics, class_level, difficulty, source filename), model, status (PENDING|COMPLETED|FAILED), draft_questions (JSON), error, created_at.

Relationship chain: users → attempts → quizzes → questions → options; attempts → answers.

## AI Question Generation (Mistral)

Faculty-only. Two modes behind `ai_service`:

1. **PDF mode:** upload PDF → `pdf_extract` (pypdf) pulls text → chunked → Mistral prompted to produce MCQs grounded in the material.
2. **Topic/syllabus mode:** faculty enters topic(s) + class level + difficulty → Mistral generates MCQs from its own knowledge.

Output is strict JSON validated by a Pydantic schema: `{question_text, options[4], correct_index, explanation, difficulty, marks}`. Results are stored as **drafts** in `ai_generation_jobs.draft_questions`. Faculty **reviews, edits, and approves** drafts; only approved items are inserted into `questions`/`options`. Unreviewed drafts never reach students. Mistral is mocked in tests.

## Auth & RBAC

- JWT access tokens (python-jose), bcrypt password hashing (passlib).
- FastAPI dependencies: `get_current_user`, `require_role(*roles)`, ownership guard for faculty resources (`quiz.created_by == user.id or user.role == ADMIN`).
- Admin bootstrapped by `seed.py` from `ADMIN_EMAIL`/`ADMIN_PASSWORD` env. Faculty accounts created/approved by Admin (register-as-faculty defaults to INACTIVE pending approval, or Admin creates directly).

## API Endpoints (MVP)

- **Auth:** `POST /api/auth/register`, `/login`, `/logout`, `GET /api/auth/me`.
- **Users (Admin):** `GET/POST /api/users`, `GET/PUT/DELETE /api/users/:id`, `PATCH /api/users/:id/status`.
- **Categories (Admin):** `GET /api/categories`, `POST/PUT/DELETE` admin-only.
- **Quizzes:** `GET /api/quizzes` (students see PUBLISHED), `GET /api/quizzes/:id`; `POST/PUT/DELETE` faculty(own)+admin; `PATCH /api/quizzes/:id/publish`.
- **Questions (Faculty own / Admin):** `GET/POST /api/quizzes/:quizId/questions`, `PUT/DELETE /api/questions/:id`.
- **AI (Faculty):** `POST /api/ai/generate` (mode, inputs, optional PDF), `GET /api/ai/jobs/:id`, `POST /api/ai/jobs/:id/approve`.
- **Attempts (Student):** `POST /api/quizzes/:quizId/start`, `POST /api/quizzes/:quizId/submit`, `GET /api/attempts`, `GET /api/attempts/:id`.
- **Admin results:** `GET /api/admin/attempts`, `GET /api/admin/analytics`.
- **Leaderboard:** `GET /api/leaderboard`.

## Scoring & Timer (backend-authoritative)

- On `start`: create IN_PROGRESS attempt, record `started_at`, compute server-side expiry = started_at + duration.
- On `submit` (or auto-submit when expired): backend loads correct options, computes correct/incorrect/unanswered, marks, percentage, pass/fail vs `passing_score`, `time_taken`; persists attempt + per-question `answers`.
- Late submissions past expiry are graded only on answers received up to expiry; server rejects new answers after expiry.

## Testing

pytest: scoring correctness, pass/fail boundary, RBAC (student blocked from admin/faculty routes; faculty blocked from others' quizzes), attempt eligibility (max_attempts), timer expiry auto-grade, AI draft→approve flow (Mistral mocked). Frontend: manual smoke.

## Build Order (step by step, verified each step)

1. Backend scaffold: config, DB session, models, Alembic baseline.
2. Auth + RBAC + `seed.py` admin.
3. Categories + Quiz CRUD (faculty-owned) + publish.
4. Question/Option CRUD.
5. AI generation (Mistral) + draft review/approve.
6. Attempt flow + timer + backend scoring + results/review.
7. Dashboards (admin/faculty/student) + analytics + leaderboard.
8. Frontend theme kit + wire all screens.
9. Tests + polish.

## Out of Scope (see FUTURE_WORK.md)

Forgot/reset password email, certificates, negative marking, CSV/Excel import, dark mode, quiz scheduling, class-enrollment/sections, additional question types, question/option randomization, email notifications.
