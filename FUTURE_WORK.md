# Future Work — Pending Implementations

Items intentionally deferred from the Core MVP. Grouped by area. See
`docs/superpowers/specs/2026-08-10-quiz-platform-design.md` for the approved MVP scope.

## Auth & Accounts
- [ ] Forgot password / reset password via email (token flow).
- [ ] Email verification on registration.
- [ ] Faculty self-registration approval queue UI (MVP: admin creates/approves directly).

## Quiz & Assessment Features
- [x] Negative marking (fixed per-quiz penalty per wrong; total clamped at ≥ 0).
      *(PDF's -0.5-style flat penalty; skipped = 0.)*
- [x] Quiz scheduling (available_from / available_until window; start gated backend-side).
- [x] Question randomization per attempt (per-quiz `shuffle_questions`, frozen per attempt).
- [x] Option randomization per question (per-quiz `shuffle_options`, frozen per attempt).
- [x] Additional question types: multiple-correct (all-or-nothing), true/false,
      fill-in-the-blank (case-insensitive, multiple accepted answers).
      - [ ] Still deferred: match-the-following, image-based, code-based.
- [ ] Configurable max-attempts enforcement UI polish.

See `docs/superpowers/specs/2026-08-11-assessment-engine-v2-design.md`.

## Quiz-Taking UI — Google-Forms style (planned during frontend step)
- [x] Render the attempt panel like Google Forms, not plain text: single-choice
      (MCQ) renders as **radio buttons** (done — matches current backend).
      - Multiple-correct → **checkboxes** *(deferred: needs backend type support)*
      - Fill-in-the-blank → **text blank input** *(deferred: needs backend type support)*
- [x] Faculty question editor lets them pick the question type (drives the control):
      single, multiple-correct (checkboxes), true/false, fill-in-the-blank (accepted-answers list).
- [x] Attempt navigation: question palette (answered/unanswered, jump-to) plus a
      per-quiz attempt layout — SCROLL (single page) or PAGED (one question per page).
- [x] Right-side **scratchpad / workout space** next to the question: a rough area
      for rough work, supporting both **freehand drawing** (canvas) and **typed** notes.
      Per-question; not graded, not submitted (local-only, persisted to localStorage).

## Classes / Enrollment (design option "C")
- [ ] Class/section entity.
- [ ] Faculty own classes; assign quizzes to a class.
- [ ] Student enrollment; students only see quizzes assigned to their class.

## AI Enhancements (Mistral)
- [ ] Auto-difficulty calibration from past attempt data.
- [ ] Bulk generation across a full syllabus outline.
- [ ] Duplicate/near-duplicate question detection.
- [ ] Regenerate/refine a single drafted question.
- [ ] Support DOCX/TXT/PPTX material in addition to PDF.
- [ ] Grounded citations (link generated question back to source passage).

## Notifications & Documents
- [ ] Email notifications (quiz completion, results, certificate).
- [ ] Certificate generation on passing a quiz (PDF).
- [ ] CSV/Excel question import.

## Security — Login IP Logging (planned during frontend step)
- [x] **Backend:** on login, capture the client IP (`request.client.host`, honoring
      `X-Forwarded-For` first hop) and return it as `client_ip` in the login response.
      - [ ] *Deferred:* for FACULTY and ADMIN logins, persist a `login_events` record
        (user_id, ip, user_agent, timestamp) for audit/misuse detection.
- [x] **Frontend:** the login box shows a security notice, and on sign-in a
      confirmation panel displays the user's detected IP with the note *"Your IP
      address is collected for security purposes and to prevent account misuse."*
      Emphasized for faculty/admin logins. (Backend returns `client_ip` on login.)
- [ ] (Later) alert/lock on logins from unexpected IPs for privileged accounts.

## UX / Platform
- [ ] Dark mode (light/dark theme toggle).
- [ ] Full responsive pass for tablet/mobile (MVP targets desktop/laptop).
- [ ] Rate limiting, CSRF hardening, secure HTTP headers middleware.
- [ ] Session/refresh-token rotation (MVP uses access token only).

## Testing & Ops
- [ ] Frontend automated tests (component + e2e).
- [ ] CI pipeline.
- [ ] Production deployment (frontend + backend + managed Postgres) and env config.
