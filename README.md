<div align="center">

# Kuizzz — Quiz Management & Online Assessment Platform

**A production-grade, full-stack platform for creating, delivering, and grading online assessments — with AI-assisted question generation.**

[![Python](https://img.shields.io/badge/Python-3.11%2B-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.118-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%2B-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Tests](https://img.shields.io/badge/tests-16%20passing-brightgreen)](#testing)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

</div>

---

## Overview

Kuizzz is a role-based assessment platform where **faculty** author quizzes (manually or with AI), **students** attempt them under a timer, and **admins** oversee the whole system. Scoring, correct answers, attempt eligibility, and the exam timer are all enforced **server-side** — the frontend is never trusted with anything that affects a grade.

The platform is built to be deployed as a real product: relational data model, database migrations, JWT auth with role-based access control, an isolated AI service, a rollback-safe test suite, and a configuration model driven entirely by environment variables.

## Key Features

### Three Roles
- **Admin** — manages all users (creates/approves faculty), categories, and quizzes; views platform-wide analytics.
- **Faculty / Teacher** — creates and manages **their own** quizzes and questions, generates questions from PDFs or syllabus topics using AI, publishes quizzes, and reviews results for their quizzes.
- **Student** — discovers and searches quizzes, attempts them under a timer, gets instant results, reviews answers with explanations, and tracks performance on a personal dashboard and leaderboard.

### AI Question Generation (Mistral)
- **PDF mode** — upload course material; the backend extracts text and generates grounded multiple-choice questions.
- **Topic / syllabus mode** — generate questions from a topic, class level, and difficulty with no source document.
- **Human-in-the-loop** — AI output is stored as **drafts**; faculty review, edit, and approve before anything reaches students. Nothing unreviewed is ever published.

### Assessment Engine
- Backend-authoritative **scoring** (correct/incorrect/unanswered, marks, percentage, pass/fail).
- Server-validated **timer** with capped time-taken and auto-submit semantics.
- **Attempt controls**: configurable max attempts, resume-in-progress, spoofed-answer rejection.
- Detailed **result & review** with per-question explanations.

### Insights
- Admin dashboard (totals, pass/fail, average score) and analytics (attempts/registrations over time, popular quizzes & categories).
- Student and faculty dashboards.
- Ranked leaderboard (overall or by category).

## Architecture

```
┌──────────────┐   REST/JSON    ┌────────────────────┐        ┌──────────────┐
│  Frontend    │ ─────────────▶ │  FastAPI Backend    │ ─────▶ │ PostgreSQL   │
│ React +      │ ◀───────────── │  JWT · RBAC · CRUD  │        │ (SQLAlchemy  │
│ Tailwind     │                │  Scoring · Timer    │        │  + Alembic)  │
└──────────────┘                │  AI Service ───────────┐     └──────────────┘
                                └────────────────────┘  │
                                                        ▼
                                                ┌──────────────┐
                                                │  Mistral API │
                                                └──────────────┘
```

Trust boundary: correct answers, scores, roles, completion status, and attempt eligibility are computed and enforced **only** on the backend.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python, FastAPI, Pydantic v2 |
| ORM / Migrations | SQLAlchemy 2.0, Alembic |
| Database | PostgreSQL (dev & prod); Neon-compatible for serverless hosting |
| Auth | JWT (python-jose), bcrypt password hashing |
| AI | Mistral API (`mistralai`), `pypdf` for document extraction |
| Frontend | React 18 (Vite), Tailwind CSS, React Router, Axios, Recharts, React Hook Form |
| Testing | pytest with transaction-rollback isolation |

## Project Structure

```
quizzz/
├─ backend/
│  ├─ app/
│  │  ├─ core/         # config, security (JWT/bcrypt), RBAC dependencies
│  │  ├─ db/           # engine, session, declarative base
│  │  ├─ models/       # users, categories, quizzes, questions, options,
│  │  │                #   attempts, answers, ai_generation_jobs
│  │  ├─ schemas/      # Pydantic request/response models
│  │  ├─ routers/      # auth, users, categories, quizzes, questions,
│  │  │                #   ai, attempts, dashboard, admin, leaderboard
│  │  ├─ services/     # scoring, ai_service (Mistral), pdf_extract, authz
│  │  ├─ seed.py       # bootstrap admin + default categories
│  │  └─ main.py       # app factory, CORS, router registration
│  ├─ alembic/         # migrations
│  ├─ scripts/         # database bootstrap SQL
│  ├─ tests/           # pytest suite
│  └─ requirements.txt
├─ frontend/           # React (Vite) app — all three role UIs
├─ docs/               # design specs
└─ FUTURE_WORK.md      # roadmap / deferred features
```

## Getting Started (Backend)

### Prerequisites
- Python 3.11+
- PostgreSQL 14+
- (Optional) A Mistral API key for AI generation

### 1. Clone & install

```bash
git clone https://github.com/Eshwar02/kuizzzz-it.git
cd kuizzzz-it/backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | SQLAlchemy URL, e.g. `postgresql+psycopg://user:pass@host:5432/quiz_platform` |
| `SECRET_KEY` | Long random string for signing JWTs |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token lifetime (default 720) |
| `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Bootstrap admin credentials used by the seed script |
| `MISTRAL_API_KEY` | Mistral API key (leave blank to disable AI generation) |
| `MISTRAL_MODEL` | Model id (default `mistral-small-latest`) |
| `FRONTEND_ORIGIN` | Allowed CORS origin (default `http://localhost:5173`) |

Generate a strong secret:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

### 3. Create the database

```bash
# Example: create a role + database (run as the postgres superuser)
sudo -u postgres psql < scripts/create_db.sql
```

Then point `DATABASE_URL` at it.

### 4. Run migrations & seed

```bash
alembic upgrade head
python -m app.seed          # creates the admin + default categories
```

### 5. Start the server

```bash
uvicorn app.main:app --reload
```

- API base: `http://localhost:8000/api`
- Interactive docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/api/health`

## Getting Started (Frontend)

The React app lives in `frontend/` and talks to the backend over REST.

```bash
cd frontend
npm install
cp .env.example .env      # set VITE_API_BASE_URL if the backend isn't on :8000
npm run dev               # http://localhost:5173
```

Build for production with `npm run build` (outputs `dist/`). Ensure the backend's
`FRONTEND_ORIGIN` matches the frontend URL so CORS allows the browser requests.

The frontend covers all three roles — student (browse, timed attempts with a
Google-Forms-style question form and a local scratchpad, results/review,
dashboard, leaderboard), faculty (quiz & question authoring, AI generation with
draft review/approve, dashboard), and admin (user management, categories,
analytics, attempts). All scoring, the exam timer, and correct answers stay
server-side; the client only renders backend responses.

## Testing

```bash
cd backend
source .venv/bin/activate
pytest -q
```

The suite runs each test inside a database transaction that is rolled back on teardown, so **tests never pollute your database**. Coverage includes auth/RBAC, ownership isolation, publish guards, attempt scoring, timer/max-attempt enforcement, AI generate/approve (Mistral mocked), dashboards, analytics, leaderboard, and user management.

## API Reference (summary)

| Group | Endpoints |
|-------|-----------|
| Auth | `POST /api/auth/register` · `POST /api/auth/login` · `POST /api/auth/logout` · `GET /api/auth/me` |
| Users (admin) | `GET/POST /api/users` · `GET/PUT/DELETE /api/users/{id}` · `PATCH /api/users/{id}/status` |
| Categories | `GET /api/categories` · `POST/PUT/DELETE` (admin) |
| Quizzes | `GET /api/quizzes` · `GET /api/quizzes/{id}` · `POST/PUT/DELETE` (faculty/admin) · `PATCH /api/quizzes/{id}/publish` |
| Questions | `GET/POST /api/quizzes/{id}/questions` · `PUT/DELETE /api/questions/{id}` |
| AI | `POST /api/ai/generate` · `GET /api/ai/jobs/{id}` · `POST /api/ai/jobs/{id}/approve` |
| Attempts | `POST /api/quizzes/{id}/start` · `POST /api/quizzes/{id}/submit` · `GET /api/attempts` · `GET /api/attempts/{id}` |
| Dashboards | `GET /api/dashboard/student` · `GET /api/dashboard/faculty` · `GET /api/admin/dashboard` · `GET /api/admin/analytics` · `GET /api/admin/attempts` |
| Leaderboard | `GET /api/leaderboard` |

Full, always-current schema is available at `/docs` (Swagger) and `/openapi.json`.

## Deployment

The backend is stateless and configured entirely via environment variables, making it straightforward to deploy on any container or PaaS host.

**Database (recommended: [Neon](https://neon.tech) serverless Postgres)**
```
DATABASE_URL=postgresql+psycopg://<user>:<password>@<host>/<db>?sslmode=require
```

**Run with a production ASGI server**
```bash
pip install -r requirements.txt
alembic upgrade head
python -m app.seed
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

**Production checklist**
- [ ] Set a strong, unique `SECRET_KEY`.
- [ ] Restrict `FRONTEND_ORIGIN` to your deployed frontend URL.
- [ ] Use a managed Postgres with SSL (`sslmode=require`).
- [ ] Keep `MISTRAL_API_KEY` server-side only (never expose to the client).
- [ ] Run behind HTTPS (reverse proxy / platform TLS).
- [ ] Configure logging and health-check monitoring on `/api/health`.

## Security

- Passwords hashed with bcrypt; authentication via signed JWTs.
- Role-based authorization on every protected route; resource ownership enforced for faculty.
- Correct answers, scoring, and attempt eligibility computed server-side and never exposed to the client during an attempt.
- Input validation via Pydantic; parameterized queries via SQLAlchemy (SQL-injection safe).

Planned hardening (rate limiting, security headers, refresh-token rotation, login IP audit) is tracked in [`FUTURE_WORK.md`](FUTURE_WORK.md).

## Roadmap

See [`FUTURE_WORK.md`](FUTURE_WORK.md) for the full list, including: additional question types (multiple-correct, true/false, fill-in-the-blank), Google-Forms-style attempt UI with a scratchpad, class/section enrollment, certificates, email notifications, negative marking, quiz scheduling, CSV/Excel import, dark mode, and login IP logging.

## License

Released under the [MIT License](LICENSE).
