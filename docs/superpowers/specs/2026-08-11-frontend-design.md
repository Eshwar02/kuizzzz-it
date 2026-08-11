# Frontend — Quiz Management & Online Assessment Platform — Design

**Date:** 2026-08-11
**Status:** Approved — implementing
**Depends on:** `2026-08-10-quiz-platform-design.md` (backend MVP, complete)

## Overview

Build the complete React frontend for the existing FastAPI backend, covering all
three roles (ADMIN, FACULTY, STUDENT). The backend is authoritative for every
trust-sensitive value (correct answers, scoring, roles, attempt eligibility,
timer expiry); the frontend only renders and never computes grades.

Scope for this build (matches backend build-order step 8): scaffold, theme kit,
auth, and every screen for all three roles. Plus three FUTURE_WORK items flagged
"planned during the frontend step": Google-Forms-style attempt UI, a local
scratchpad, and login-IP display.

## Tech Stack

- Vite + React 18, npm.
- Tailwind CSS (theme tokens for palette).
- React Router v6.
- Axios (single client with JWT + 401 interceptors).
- Recharts (admin analytics).
- React Hook Form (forms).

## Design System (UI)

- Palette: pale-violet accents (`#B9A7E0` / `#8B7BB8`) on off-white surfaces
  (`#F7F5F2` / `#FFFFFF`), ink `#2B2740`.
- **Boxy UI:** square-ish cards, defined 1px borders (`border-ink/15`), minimal
  radius, flat structured tables, consistent 4/8px spacing grid.
- Tailwind config extends colors/spacing; tokens live in `src/theme/`.
- Every screen composes the shared kit — no ad-hoc styling.

## Repository Layout

```
frontend/
├─ index.html
├─ package.json
├─ vite.config.js
├─ tailwind.config.js
├─ postcss.config.js
├─ .env.example              # VITE_API_BASE_URL=http://localhost:8000
└─ src/
   ├─ main.jsx, App.jsx, router.jsx
   ├─ api/
   │  ├─ client.js           # axios instance, baseURL, interceptors
   │  ├─ auth.js, users.js, categories.js, quizzes.js, questions.js,
   │  │  ai.js, attempts.js, dashboard.js, leaderboard.js
   ├─ auth/
   │  ├─ AuthContext.jsx     # token + current user, login/logout/register
   │  ├─ ProtectedRoute.jsx  # requires auth
   │  └─ RoleRoute.jsx       # requires role(s)
   ├─ components/
   │  ├─ ui/                 # Card, Button, Input, Select, Textarea, Table,
   │  │                      #   Stat, Badge, Modal, Spinner, EmptyState, Toast,
   │  │                      #   Pagination-less list helpers
   │  ├─ layout/             # AppLayout, Sidebar (role-aware), Topbar
   │  └─ quiz/               # QuestionForm, OptionEditor, Timer, Scratchpad,
   │                         #   AttemptQuestionCard, DraftReviewList
   ├─ pages/
   │  ├─ auth/               # Login, Register
   │  ├─ student/            # Browse, QuizDetail, Attempt, Result,
   │  │                      #   MyAttempts, Dashboard, Leaderboard
   │  ├─ faculty/            # MyQuizzes, QuizForm, QuestionManager,
   │  │                      #   AIGenerate, QuizResults, Dashboard
   │  └─ admin/              # Users, Categories, Analytics, AllAttempts, Dashboard
   ├─ lib/                   # formatters (date, %), useCountdown hook, toast store
   └─ theme/                 # tokens.js
```

## Auth & Routing

- `AuthContext` holds the JWT (localStorage key `kuizzz_token`) and current user.
  On mount, if a token exists, it calls `GET /api/auth/me` to hydrate the user;
  a failure clears the token.
- Axios request interceptor attaches `Authorization: Bearer <token>`. Response
  interceptor: on 401, clear auth and redirect to `/login`.
- `ProtectedRoute` requires authentication. `RoleRoute(...roles)` enforces RBAC
  and redirects unauthorized users to their role home
  (student → `/`, faculty → `/faculty`, admin → `/admin`).
- `AppLayout`: role-aware sidebar nav + topbar with user menu (name, role badge,
  logout). Auth pages render outside the layout.

### Auth pages
- **Login:** email + password. Displays the detected IP address returned by the
  login response with the notice: *"Your IP address is collected for security
  purposes and to prevent account misuse."* (emphasis for faculty/admin). On
  success, stores token + user and routes to role home.
- **Register:** name, email, password, and an "I am faculty" checkbox. Students
  self-register (ACTIVE). Faculty registration returns an INACTIVE account; UI
  shows a "pending admin approval" confirmation and does not auto-login faculty.

## API Wrappers (match backend exactly)

Base `/api`. Wrappers map 1:1 to endpoints:

- **auth:** `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`,
  `GET /auth/me`.
- **users (admin):** `GET /users?role&status&search`, `POST /users`,
  `GET/PUT/DELETE /users/:id`, `PATCH /users/:id/status`.
- **categories:** `GET /categories`; `POST/PUT/DELETE` (admin).
- **quizzes:** `GET /quizzes?category_id&search&mine`, `GET /quizzes/:id`,
  `POST/PUT/DELETE /quizzes/:id`, `PATCH /quizzes/:id/publish`.
- **questions:** `GET/POST /quizzes/:id/questions`, `PUT/DELETE /questions/:id`.
- **ai:** `POST /ai/generate` (multipart: mode, topics, class_level, difficulty,
  num_questions, quiz_id?, file?), `GET /ai/jobs/:id`,
  `POST /ai/jobs/:id/approve` (`{quiz_id, questions[]}`).
- **attempts:** `POST /quizzes/:id/start`, `POST /quizzes/:id/submit`
  (`{attempt_id, answers[]}`), `GET /attempts`, `GET /attempts/:id`.
- **dashboard:** `GET /dashboard/student`, `GET /dashboard/faculty`.
- **admin:** `GET /admin/dashboard`, `GET /admin/analytics`,
  `GET /admin/attempts`, `GET /admin/attempts/:id`.
- **leaderboard:** `GET /leaderboard?category_id&limit`.

## Screens by Role

### Student
- **Browse:** grid of published quizzes; filters = category select + search box
  (drives `GET /quizzes?category_id&search`). Each card: title, category,
  difficulty badge, duration, question count, "Start" → detail.
- **Quiz detail:** meta (duration, passing score, max attempts, question count),
  prior attempts summary, "Start attempt" button.
- **Attempt** (see Attempt Flow below).
- **Result / review:** score, %, correct/incorrect/unanswered, pass/fail badge,
  time taken; per-question review with selected vs correct option and
  explanation (from `AttemptResult.review`).
- **My Attempts:** table from `GET /attempts` (quiz title, %, status, date →
  result).
- **Dashboard:** Stat cards (attempted, passed, failed, avg, highest) + recent
  attempts list from `GET /dashboard/student`.
- **Leaderboard:** ranked table from `GET /leaderboard`; category filter +
  optional limit.

### Faculty
- **My Quizzes:** `GET /quizzes?mine=true`; status badges (DRAFT/PUBLISHED/
  UNPUBLISHED); actions: edit, manage questions, publish toggle, delete.
- **Quiz form:** create/edit (title, description, category, class_level,
  difficulty, duration, passing_score, max_attempts, thumbnail_url) via React
  Hook Form.
- **Question manager:** list quiz questions; add/edit/delete. `OptionEditor`
  enforces 2–6 options with **exactly one** marked correct (client validation
  mirrors backend). Fields: text, marks, explanation, difficulty.
- **Publish toggle:** `PATCH /quizzes/:id/publish` with target status.
- **AI Generate:** choose mode (PDF upload | Topic). Topic form: topics,
  class_level, difficulty, num_questions. Submit → job id → poll
  `GET /ai/jobs/:id` until COMPLETED/FAILED → render editable draft list
  (`DraftReviewList`, one-correct enforced) → approve into a quiz via
  `POST /ai/jobs/:id/approve`.
- **Quiz results:** attempts on own quizzes (reuses attempt list/detail).
- **Dashboard:** Stat cards from `GET /dashboard/faculty`.

### Admin
- **Users:** table with role + status filters and search; create user modal;
  edit (name/password/role/status); activate/deactivate via status PATCH;
  delete. This is how faculty get approved (set status ACTIVE / role FACULTY).
- **Categories:** list + create/edit/delete (modals).
- **Analytics:** Recharts from `GET /admin/analytics` — attempts over time,
  registrations over time (line), pass/fail (bar/pie), popular quizzes &
  categories (bar).
- **All attempts:** table from `GET /admin/attempts` → detail.
- **Dashboard:** platform Stat cards from `GET /admin/dashboard`.

## Attempt Flow (Google-Forms style + scratchpad)

1. `POST /quizzes/:id/start` → `StartAttemptResponse` (questions with options,
   no correctness; `started_at`, `expires_at`).
2. Render each question as a **radio-group card** (single-correct MCQ = radio
   buttons), clean vertical form layout. Selection state kept in component
   memory keyed by `question_id`.
3. Live **countdown** driven by server `expires_at` (`useCountdown`). When it
   reaches zero → auto-submit. A visible timer badge warns near expiry.
4. Collapsible right-side **Scratchpad**: freehand `<canvas>` + a typed notes
   textarea, per-question, persisted to `localStorage` only, cleared on submit.
   Never sent to the server, never graded.
5. Submit builds `{attempt_id, answers:[{question_id, selected_option_id|null}]}`
   → `POST /quizzes/:id/submit` → `AttemptResult` → Result page.

All scoring, timer enforcement, and correctness remain server-side.

## Backend Addition (minimal — for login-IP display)

The only backend change in this build: on `POST /api/auth/login`, capture the
client IP (`request.client.host`, honoring `X-Forwarded-For` first hop when
present) and add a `client_ip: str | None` field to the `Token` response schema
so the login box can display it.

**Deferred (out of scope here):** the `login_events` audit table (migration +
model) for persisting faculty/admin logins — stays in FUTURE_WORK.

## Error Handling

- Central axios interceptor surfaces API errors; a lightweight `Toast` store
  shows failures (validation, 401/403/404/500).
- Forms show field-level validation (React Hook Form) mirroring backend rules
  (e.g., one-correct-option, password length, required fields).
- Loading states via `Spinner`; empty states via `EmptyState`.
- 403 renders a "not authorized" view; unknown routes render a 404 page.

## Testing

- Manual smoke per the backend spec (frontend automated tests are in
  FUTURE_WORK). Verify against a running backend + seeded admin: login for each
  role, quiz CRUD, question one-correct rule, AI draft→approve, attempt timer +
  auto-submit, results/review, dashboards, analytics, leaderboard, user
  management/faculty approval.

## Out of Scope (stays in FUTURE_WORK)

Multiple-correct / true-false / fill-in-blank question types, question/option
randomization, negative marking, quiz scheduling, class/section enrollment,
certificates, email notifications, CSV/Excel import, dark mode, full mobile
responsive pass, login_events audit persistence, refresh-token rotation,
frontend automated tests, CI, production deployment.
