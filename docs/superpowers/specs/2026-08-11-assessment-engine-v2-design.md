# Assessment Engine v2 — Design

**Date:** 2026-08-11
**Status:** Approved — implementing
**Depends on:** `2026-08-10-quiz-platform-design.md` (backend MVP), `2026-08-11-frontend-design.md` (frontend). Both complete.

## Overview

The MVP ships single-correct MCQ quizzes with a fixed scoring model and a
Google-Forms-style attempt UI. This build adds the assessment-richness features
from the source PDF's *Future Enhancement* (§10) and *Advanced Features* (§26)
sections, plus the question-navigation requirement (§11):

- **A — Question types:** multiple-correct, true/false, fill-in-the-blank
  (in addition to today's single-correct).
- **B — Negative marking:** per-quiz fixed penalty per wrong answer.
- **C — Randomization:** per-quiz question and/or option shuffle per attempt.
- **D — Scheduling:** per-quiz availability window (start/end).
- **E — Attempt navigation:** a question palette (answered/unanswered), and a
  **per-quiz attempt layout** the faculty chooses at creation — `SCROLL`
  (single-scroll, today's behavior) or `PAGED` (one question per page).

**Trust rule (unchanged):** all correctness, scoring, timer, eligibility, and
randomization decisions are backend-authoritative. The frontend never receives
`is_correct` / correct answers / accepted-answer text during an attempt.

**Out of scope:** AI generation still emits `SINGLE_CHOICE` only. Analytics and
leaderboard remain percentage-based and need no change.

## Design Decisions (locked)

- Multiple-correct scoring: **all-or-nothing** (full marks iff selected set ==
  correct set exactly; otherwise incorrect, zero marks).
- Negative marking: **fixed value per quiz** applied to each wrong answer
  regardless of the question's marks. Skipped/unanswered = 0.
- Fill-in-the-blank matching: **case-insensitive, trimmed, multiple accepted
  answers** (author stores a list; student text is `strip().casefold()` before
  comparison).
- Attempt navigation: **question palette + both layout modes** selectable per
  quiz.

## Data Model Changes

New enums (`app/models/enums.py`):

```python
class QuestionType(str, enum.Enum):
    SINGLE_CHOICE = "SINGLE_CHOICE"       # default; == today's behavior
    MULTIPLE_CHOICE = "MULTIPLE_CHOICE"
    TRUE_FALSE = "TRUE_FALSE"
    FILL_BLANK = "FILL_BLANK"

class AttemptLayout(str, enum.Enum):
    SCROLL = "SCROLL"   # single-scroll (Google-Forms), default
    PAGED = "PAGED"     # one question per page
```

**`questions`** — add:
- `question_type: QuestionType` (default `SINGLE_CHOICE`, not null)
- `accepted_answers: JSON` (list[str], nullable — only for `FILL_BLANK`)

**`quizzes`** — add:
- `negative_marking_enabled: bool` (default `false`)
- `negative_marks_per_wrong: float` (default `0`) — flat penalty per wrong
- `shuffle_questions: bool` (default `false`)
- `shuffle_options: bool` (default `false`)
- `available_from: datetime | None`, `available_until: datetime | None`
- `attempt_layout: AttemptLayout` (default `SCROLL`, not null)

**`answers`** — keep `selected_option_id` (SINGLE_CHOICE / TRUE_FALSE path,
unchanged), add:
- `selected_option_ids: JSON` (list[int], nullable — MULTIPLE_CHOICE only)
- `text_answer: String` (nullable — FILL_BLANK only)

**`attempts`** — add:
- `layout: JSON` (nullable) — the frozen presentation order for this attempt:
  `{"questions": [qid, ...], "options": {qid: [oid, ...]}}`. Written once when
  the attempt is created; reused on resume/refresh so ordering is stable.

One Alembic migration adds all columns. Existing rows take the defaults, which
reproduce today's behavior exactly (single-choice, no penalty, no shuffle, no
schedule, scroll layout) — zero behavioral change for existing data.

## Scoring (`services/scoring.py`)

`grade()` gains the question's type and the quiz's negative-marking config, and
branches per `question_type`:

- **SINGLE_CHOICE / TRUE_FALSE:** correct iff `selected_option_id` is the single
  `is_correct` option. (TRUE_FALSE is just two options, one correct.)
- **MULTIPLE_CHOICE:** correct iff `set(selected_option_ids) == {o.id for o in
  options if o.is_correct}` (all-or-nothing). Empty selection = unanswered.
- **FILL_BLANK:** normalize `text_answer` with `strip().casefold()`; correct iff
  it equals any normalized entry in `accepted_answers`. Blank/empty = unanswered.

Marks:
- Correct → `+question.marks`.
- Incorrect (answered but wrong) → if `negative_marking_enabled`, subtract
  `negative_marks_per_wrong` from the running total.
- Unanswered → 0, no penalty.
- `obtained_marks = max(0, raw_total)` (clamp at zero). `percentage =
  round(obtained_marks / total_marks * 100, 2)`; pass iff `>= passing_score`.

`GradedAnswer` carries whichever answer shape applies (`selected_option_id`,
`selected_option_ids`, or `text_answer`) so the router can persist it.

## Start Attempt: Eligibility + Randomization (`routers/attempts.py`)

- **Scheduling gate:** before creating/resuming, if `available_from` is set and
  `now < available_from` → 403 "This quiz is not yet available"; if
  `available_until` is set and `now > available_until` → 403 "This quiz is no
  longer available". (Publish status check stays.)
- **Randomization / layout freeze:** when a new attempt is created, build
  `layout`: question id order (shuffled iff `shuffle_questions`) and, per
  question, option id order (shuffled iff `shuffle_options`; ignored for
  `FILL_BLANK`). Persist on the attempt. On resume, reuse the stored `layout`.
- `StartAttemptResponse` returns questions/options in `layout` order, includes
  each question's `question_type`, and for `FILL_BLANK` returns an empty options
  list. `is_correct` / `accepted_answers` are never included.

## Submit (`routers/attempts.py`)

`SubmitAttemptRequest.answers` items carry an optional
`selected_option_id`, `selected_option_ids`, and `text_answer`. The router:
- validates option ids belong to their question (existing anti-spoof logic,
  extended to the list form),
- passes typed selections to `scoring.grade()`,
- persists `Answer` rows with the appropriate column(s) filled,
- writes `attempt.score/percentage/...` and status as today.

Timer capping and auto-submit-at-expiry logic are unchanged.

## Faculty Question Editor (frontend)

`components/quiz/QuestionForm.jsx` + `OptionEditor.jsx`:
- **Type picker** (Single / Multiple / True/False / Fill-blank) drives the
  control shown and the validation:
  - **Single:** 2–6 options, **exactly one** correct (today's rule).
  - **Multiple:** 2–6 options, **≥1** correct.
  - **True/False:** auto two fixed options (True, False), author picks the
    correct one; option text not editable.
  - **Fill-blank:** no options; an **accepted-answers list editor** (≥1 entry).
- Client validation mirrors the backend rules per type; submit shape adapts.

`pages/faculty/QuizForm.jsx` gains fields for: `attempt_layout` (Scroll/Paged
picker), `negative_marking_enabled` + `negative_marks_per_wrong`,
`shuffle_questions`, `shuffle_options`, `available_from`, `available_until`.

`DraftReviewList` (AI) is unaffected — AI drafts remain single-choice.

## Attempt UI (frontend) — two layouts, shared palette

`pages/student/Attempt.jsx` renders per the quiz's `attempt_layout`:
- **SCROLL:** all questions in one vertical form (today); palette click scrolls
  to the question.
- **PAGED:** one `AttemptQuestionCard` per screen with **Prev / Next**,
  "Question x of n"; submit is reachable from the last page and via the palette.
  Palette click jumps to that page.

Shared across both modes:
- **Question palette** (new component): numbered cells with answered /
  unanswered state (per-type "answered" logic — a chosen option, a non-empty
  selected set, or non-empty text), current-question highlight, click to
  navigate.
- `AttemptQuestionCard` renders by `question_type`: **radios** (single),
  **checkboxes** (multiple), **True/False radios**, or a **text input** (blank).
- Live countdown + auto-submit, and the collapsible per-question Scratchpad
  (localStorage-only), both unchanged.
- Selection state is kept in component memory keyed by `question_id`, so
  navigating never loses answers. Submit builds
  `{attempt_id, answers:[{question_id, selected_option_id?, selected_option_ids?,
  text_answer?}]}`.

## Result / Review (frontend)

`pages/student/Result.jsx` shows per-type review:
- Single/True-False: selected option vs correct option (today).
- Multiple: selected set vs correct set (highlight missed / wrongly-picked).
- Fill-blank: entered text vs the list of accepted answers.
- Marks line reflects any negative-marking penalty; the header still shows
  correct / incorrect / unanswered / % / pass-fail / time taken.

`AttemptResult.review` (`AnswerReview`) is extended with `question_type`,
`correct_option_ids` (list), `accepted_answers` (list), `selected_option_ids`,
and `text_answer`; `correct_option_id` stays for the single-choice case.

## Browse / Quiz Detail (frontend)

`Browse` and `QuizDetail` surface scheduling state: **Upcoming** (before
`available_from`) and **Closed** (after `available_until`) badges, with the Start
control disabled outside the window. The backend remains the authority (start
still 403s); the UI states are advisory.

## API Wrapper Changes (frontend `src/api`)

No new endpoints. Existing wrappers carry the new request/response fields:
`quizzes` (create/update payload + read model), `questions` (type +
accepted_answers), `attempts` (start response question_type/options, submit
answer shapes, result review fields).

## Testing

pytest (`backend/tests`), extending the existing suite (which must stay green):
- multiple-choice all-or-nothing (exact match passes; subset/superset fail);
- true/false correctness;
- fill-blank normalization (case/whitespace variants match; wrong text fails);
- negative marking subtracts per wrong and clamps `obtained_marks` at 0;
- scheduling gate 403s before `available_from` / after `available_until`;
- resume reuses the frozen `layout` (order stable across two starts);
- start never leaks `is_correct` / `accepted_answers`.

Frontend: manual smoke — create one quiz of each type in both layouts, attempt
via palette in scroll and paged modes, verify results/review per type and the
negative-marking total.

## Build Order (backend first)

1. Enums + model columns + one Alembic migration (defaults preserve current
   behavior).
2. Schemas (quiz, question, attempt) for the new fields/shapes.
3. Scoring per type + negative marking (unit-tested first).
4. Start-attempt eligibility + layout freeze/randomization; submit persistence.
5. Faculty question editor + quiz-form fields (frontend).
6. Attempt UI: palette + scroll/paged modes + per-type controls.
7. Result/review per type; Browse/Detail scheduling badges.
8. Tests + manual smoke.
</content>
</invoke>
