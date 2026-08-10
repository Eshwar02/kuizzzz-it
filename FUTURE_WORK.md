# Future Work — Pending Implementations

Items intentionally deferred from the Core MVP. Grouped by area. See
`docs/superpowers/specs/2026-08-10-quiz-platform-design.md` for the approved MVP scope.

## Auth & Accounts
- [ ] Forgot password / reset password via email (token flow).
- [ ] Email verification on registration.
- [ ] Faculty self-registration approval queue UI (MVP: admin creates/approves directly).

## Quiz & Assessment Features
- [ ] Negative marking (e.g. correct +2, wrong -0.5, skipped 0).
- [ ] Quiz scheduling (start date, end date, availability windows).
- [ ] Question randomization per attempt.
- [ ] Option randomization per question.
- [ ] Additional question types: multiple-correct, true/false, fill-in-the-blank,
      match-the-following, image-based, code-based.
- [ ] Configurable max-attempts enforcement UI polish.

## Quiz-Taking UI — Google-Forms style (planned during frontend step)
- [ ] Render the attempt panel like Google Forms, not plain text: the input control
      is chosen by the question **type/mode set by faculty**:
      - Single-choice (MCQ) → **radio buttons**
      - Multiple-correct → **checkboxes**
      - Fill-in-the-blank → **text blank input**
- [ ] Faculty question editor lets them pick the question type (drives the control).
      (Backend currently supports single-correct MCQ; multiple-correct and
      fill-in-the-blank types must be added to models/scoring — see question types below.)
- [ ] Right-side **scratchpad / workout space** next to the question: a rough area
      for rough work, supporting both **freehand drawing** (canvas) and **typed** notes.
      Per-question or per-quiz; not graded, not submitted (local only for MVP).

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
- [ ] **Backend:** on login, capture the client IP (`request.client.host`, honoring
      `X-Forwarded-For` when behind a proxy). Return the detected IP in the login
      response. For FACULTY and ADMIN logins, persist a `login_events` record
      (user_id, ip, user_agent, timestamp) for audit/misuse detection.
- [ ] **Frontend:** in the login box, display the user's detected IP address with a
      note: *"Your IP address is collected for security purposes and to prevent
      account misuse."* Emphasize this for faculty/admin logins.
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
