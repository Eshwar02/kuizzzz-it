# Assessment Engine v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multiple-correct / true-false / fill-blank question types, per-quiz negative marking, question/option randomization, availability scheduling, and a per-quiz attempt layout (scroll vs paged) with a question palette — all backend-authoritative.

**Architecture:** Additive changes only. New enums + nullable/defaulted columns on `questions`/`quizzes`/`answers`/`attempts` (one Alembic migration; existing rows keep today's behavior). Scoring branches per `question_type`; start-attempt freezes a per-attempt presentation `layout` (order) so refresh/resume is stable and gates on the availability window. Frontend reads the new fields and renders per type and per layout.

**Tech Stack:** Backend — Python 3, FastAPI, SQLAlchemy, Alembic, Pydantic, pytest. Frontend — Vite + React 18, React Router v6, Axios, Tailwind.

## Global Constraints

- Backend is authoritative for correctness, scoring, timer, eligibility, randomization. The frontend never receives `is_correct`, correct option ids, or `accepted_answers` during an attempt (only in the post-submit review).
- All new DB columns are added in **one** Alembic migration and default to values that reproduce current behavior (`SINGLE_CHOICE`, `SCROLL`, no penalty, no shuffle, no schedule).
- The existing pytest suite (`backend/tests/test_scoring.py`, `test_api_flow.py`) must stay green after every task.
- Follow existing code style: SQLAlchemy 2.0 `Mapped[...]` columns, Pydantic v2 (`ConfigDict(from_attributes=True)`, `model_validator`), and the boxy Tailwind UI kit in `frontend/src/components/ui`.
- Multiple-correct scoring is **all-or-nothing**. Negative marking is a **fixed value per quiz** applied per wrong answer, total clamped at ≥ 0. Fill-blank matching is `strip().casefold()` against a list of accepted answers.
- Tests run against the dev Postgres inside a rolled-back transaction, so the migration must be applied to the dev DB (`alembic upgrade head`) before running pytest.

---

### Task 1: Enums, model columns, and migration

**Files:**
- Modify: `backend/app/models/enums.py`
- Modify: `backend/app/models/question.py`
- Modify: `backend/app/models/quiz.py`
- Modify: `backend/app/models/attempt.py`
- Create: `backend/alembic/versions/<rev>_assessment_engine_v2.py`

**Interfaces:**
- Produces: `QuestionType` (`SINGLE_CHOICE|MULTIPLE_CHOICE|TRUE_FALSE|FILL_BLANK`) and `AttemptLayout` (`SCROLL|PAGED`) enums; `Question.question_type`, `Question.accepted_answers`; `Quiz.negative_marking_enabled`, `Quiz.negative_marks_per_wrong`, `Quiz.shuffle_questions`, `Quiz.shuffle_options`, `Quiz.available_from`, `Quiz.available_until`, `Quiz.attempt_layout`; `Answer.selected_option_ids`, `Answer.text_answer`; `Attempt.layout`.

- [ ] **Step 1: Add the two enums**

In `backend/app/models/enums.py`, append:

```python
class QuestionType(str, enum.Enum):
    SINGLE_CHOICE = "SINGLE_CHOICE"
    MULTIPLE_CHOICE = "MULTIPLE_CHOICE"
    TRUE_FALSE = "TRUE_FALSE"
    FILL_BLANK = "FILL_BLANK"


class AttemptLayout(str, enum.Enum):
    SCROLL = "SCROLL"
    PAGED = "PAGED"
```

- [ ] **Step 2: Add columns to Question**

In `backend/app/models/question.py`, add `JSON` to the sqlalchemy import (`from sqlalchemy import Boolean, Enum as SAEnum, ForeignKey, Integer, String, Text, JSON`), import the enum (`from app.models.enums import Difficulty, QuestionSource, QuestionType`), and add these columns to `Question` (after `source`):

```python
    question_type: Mapped[QuestionType] = mapped_column(
        SAEnum(QuestionType, name="question_type"),
        default=QuestionType.SINGLE_CHOICE,
        nullable=False,
    )
    accepted_answers: Mapped[list | None] = mapped_column(JSON, nullable=True)
```

- [ ] **Step 3: Add columns to Quiz**

In `backend/app/models/quiz.py`, add `Boolean, Float` to the sqlalchemy import, import `AttemptLayout` (`from app.models.enums import AttemptLayout, Difficulty, QuizStatus`), and add after `thumbnail_url`:

```python
    negative_marking_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    negative_marks_per_wrong: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    shuffle_questions: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    shuffle_options: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    available_from: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    available_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    attempt_layout: Mapped[AttemptLayout] = mapped_column(
        SAEnum(AttemptLayout, name="attempt_layout"),
        default=AttemptLayout.SCROLL,
        nullable=False,
    )
```

- [ ] **Step 4: Add columns to Answer and Attempt**

In `backend/app/models/attempt.py`, add `JSON, String` to the sqlalchemy import. Add to `Attempt` (after `completed_at`):

```python
    layout: Mapped[dict | None] = mapped_column(JSON, nullable=True)
```

Add to `Answer` (after `selected_option_id`):

```python
    selected_option_ids: Mapped[list | None] = mapped_column(JSON, nullable=True)
    text_answer: Mapped[str | None] = mapped_column(String(1000), nullable=True)
```

- [ ] **Step 5: Generate the migration**

Run: `cd backend && alembic revision --autogenerate -m "assessment_engine_v2"`
Expected: a new file under `backend/alembic/versions/` whose `upgrade()` adds the new enum types and columns.

- [ ] **Step 6: Verify the migration content**

Open the generated file. Confirm `upgrade()` creates the `question_type` and `attempt_layout` enum types and `add_column` calls for every field from Steps 2–4, and `downgrade()` drops them. If autogenerate set the new non-nullable columns without a server default, add `server_default` so existing rows populate — e.g. `sa.Column("question_type", sa.Enum(...), server_default="SINGLE_CHOICE", nullable=False)`, `attempt_layout` → `server_default="SCROLL"`, the booleans → `server_default=sa.text("false")`, `negative_marks_per_wrong` → `server_default="0"`.

- [ ] **Step 7: Apply the migration to the dev DB**

Run: `cd backend && alembic upgrade head`
Expected: `Running upgrade ... assessment_engine_v2`, no errors.

- [ ] **Step 8: Confirm existing tests still pass**

Run: `cd backend && pytest -q`
Expected: all existing tests PASS (models import cleanly, columns exist).

- [ ] **Step 9: Commit**

```bash
git add backend/app/models backend/alembic/versions
git commit -m "feat(models): question types, neg-marking, shuffle, schedule, attempt layout columns"
```

---

### Task 2: Schemas for the new fields

**Files:**
- Modify: `backend/app/schemas/question.py`
- Modify: `backend/app/schemas/quiz.py`
- Modify: `backend/app/schemas/attempt.py`

**Interfaces:**
- Consumes: enums from Task 1.
- Produces: `QuestionCreate`/`QuestionUpdate` accept `question_type` + `accepted_answers` with per-type validation; `QuestionOut` exposes them. `QuizCreate`/`QuizUpdate`/`QuizOut` carry the new quiz fields. `AttemptQuestion.question_type`, `SubmittedAnswer.selected_option_ids`/`.text_answer`, and `AnswerReview` extended fields.

- [ ] **Step 1: Extend question schemas with per-type validation**

Replace the body of `backend/app/schemas/question.py` from `class QuestionCreate` through `class QuestionOut` with:

```python
class QuestionBase(BaseModel):
    question_text: str = Field(min_length=1)
    marks: int = Field(default=1, ge=1, le=100)
    explanation: str | None = None
    difficulty: Difficulty = Difficulty.INTERMEDIATE
    question_type: QuestionType = QuestionType.SINGLE_CHOICE


def _validate_by_type(qtype, options, accepted):
    if qtype == QuestionType.FILL_BLANK:
        if not accepted or not [a for a in accepted if a and a.strip()]:
            raise ValueError("Fill-blank questions need at least one accepted answer")
        return
    if options is None:
        raise ValueError("Choice questions need options")
    n_correct = len([o for o in options if o.is_correct])
    if qtype == QuestionType.TRUE_FALSE:
        if len(options) != 2 or n_correct != 1:
            raise ValueError("True/False needs exactly two options, one correct")
    elif qtype == QuestionType.MULTIPLE_CHOICE:
        if n_correct < 1:
            raise ValueError("Multiple-choice needs at least one correct option")
    else:  # SINGLE_CHOICE
        if n_correct != 1:
            raise ValueError("Exactly one option must be marked correct")


class QuestionCreate(QuestionBase):
    options: list[OptionIn] | None = Field(default=None, max_length=6)
    accepted_answers: list[str] | None = None

    @model_validator(mode="after")
    def check(self) -> "QuestionCreate":
        if self.question_type != QuestionType.FILL_BLANK and self.options and len(self.options) < 2:
            raise ValueError("Choice questions need at least two options")
        _validate_by_type(self.question_type, self.options, self.accepted_answers)
        return self


class QuestionUpdate(BaseModel):
    question_text: str | None = Field(default=None, min_length=1)
    marks: int | None = Field(default=None, ge=1, le=100)
    explanation: str | None = None
    difficulty: Difficulty | None = None
    question_type: QuestionType | None = None
    options: list[OptionIn] | None = Field(default=None, max_length=6)
    accepted_answers: list[str] | None = None

    @model_validator(mode="after")
    def check(self) -> "QuestionUpdate":
        if self.question_type is not None:
            _validate_by_type(self.question_type, self.options, self.accepted_answers)
        return self


class QuestionOut(QuestionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    quiz_id: int
    source: QuestionSource
    accepted_answers: list[str] | None = None
    options: list[OptionOut]
```

Update the import line to `from app.models.enums import Difficulty, QuestionSource, QuestionType`.

- [ ] **Step 2: Extend quiz schemas**

In `backend/app/schemas/quiz.py`, update the import to `from app.models.enums import AttemptLayout, Difficulty, QuizStatus`, add `from datetime import datetime` is already present. Add these fields to **`QuizCreate`** and the same as `| None` defaults to **`QuizUpdate`**, and non-optional to **`QuizOut`**:

```python
    # QuizCreate / QuizOut
    negative_marking_enabled: bool = False
    negative_marks_per_wrong: float = Field(default=0.0, ge=0, le=100)
    shuffle_questions: bool = False
    shuffle_options: bool = False
    available_from: datetime | None = None
    available_until: datetime | None = None
    attempt_layout: AttemptLayout = AttemptLayout.SCROLL
```

For `QuizUpdate`, add the same names all defaulting to `None` (types `bool | None`, `float | None`, `datetime | None`, `AttemptLayout | None`).

- [ ] **Step 3: Extend attempt schemas**

In `backend/app/schemas/attempt.py`, update import to `from app.models.enums import AttemptStatus, AttemptLayout, QuestionType`. Then:

Add `question_type` and make options optional on `AttemptQuestion`, and carry accepted-blank flag is NOT sent. Replace `AttemptQuestion` and `StartAttemptResponse`, `SubmittedAnswer`, `AnswerReview`:

```python
class AttemptQuestion(BaseModel):
    id: int
    question_text: str
    marks: int
    question_type: QuestionType
    options: list[AttemptOption] = []


class StartAttemptResponse(BaseModel):
    attempt_id: int
    quiz_id: int
    quiz_title: str
    duration_minutes: int
    attempt_layout: AttemptLayout
    started_at: datetime
    expires_at: datetime
    questions: list[AttemptQuestion]


class SubmittedAnswer(BaseModel):
    question_id: int
    selected_option_id: int | None = None
    selected_option_ids: list[int] | None = None
    text_answer: str | None = None


class SubmitAttemptRequest(BaseModel):
    attempt_id: int
    answers: list[SubmittedAnswer] = Field(default_factory=list)
```

And extend `AnswerReview` with:

```python
    question_type: QuestionType = QuestionType.SINGLE_CHOICE
    correct_option_ids: list[int] = Field(default_factory=list)
    accepted_answers: list[str] | None = None
    selected_option_ids: list[int] | None = None
    text_answer: str | None = None
```

- [ ] **Step 4: Verify schemas import and tests pass**

Run: `cd backend && python -c "import app.main" && pytest -q`
Expected: import OK; all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/schemas
git commit -m "feat(schemas): per-type question, quiz config, and attempt fields"
```

---

### Task 3: Scoring per type + negative marking (TDD)

**Files:**
- Modify: `backend/app/services/scoring.py`
- Test: `backend/tests/test_scoring.py`

**Interfaces:**
- Consumes: `Question` (with `question_type`, `options`, `accepted_answers`, `marks`) from Task 1.
- Produces: `grade(questions, selections, passing_score, *, negative_marks=0.0) -> ScoreResult` where `selections[qid]` is a `TypedSelection` dataclass carrying `option_id | option_ids | text`. `GradedAnswer` gains `selected_option_ids: list[int] | None` and `text_answer: str | None`.

- [ ] **Step 1: Write failing tests for each type + negative marking**

Append to `backend/tests/test_scoring.py` (add imports `from app.models.enums import QuestionType` and reuse existing question/option builders in that file; if the file builds `Question`/`Option` inline, mirror that style):

```python
def _q(qid, marks, qtype, options=None, accepted=None):
    from app.models.question import Question, Option
    q = Question(id=qid, quiz_id=1, question_text="q", marks=marks, question_type=qtype,
                 accepted_answers=accepted)
    q.options = [Option(id=oid, question_id=qid, option_text=t, is_correct=c)
                 for (oid, t, c) in (options or [])]
    return q


def test_multiple_choice_all_or_nothing():
    from app.services.scoring import grade, TypedSelection
    q = _q(1, 2, QuestionType.MULTIPLE_CHOICE,
           options=[(10, "a", True), (11, "b", True), (12, "c", False)])
    exact = grade([q], {1: TypedSelection(option_ids=[10, 11])}, 50)
    assert exact.obtained_marks == 2 and exact.correct_answers == 1
    partial = grade([q], {1: TypedSelection(option_ids=[10])}, 50)
    assert partial.obtained_marks == 0 and partial.incorrect_answers == 1


def test_fill_blank_normalized_match():
    from app.services.scoring import grade, TypedSelection
    q = _q(1, 1, QuestionType.FILL_BLANK, accepted=["Paris", "paris city"])
    ok = grade([q], {1: TypedSelection(text="  paris  ")}, 50)
    assert ok.correct_answers == 1 and ok.obtained_marks == 1
    bad = grade([q], {1: TypedSelection(text="london")}, 50)
    assert bad.incorrect_answers == 1


def test_negative_marking_clamps_at_zero():
    from app.services.scoring import grade, TypedSelection
    q1 = _q(1, 2, QuestionType.SINGLE_CHOICE, options=[(10, "a", True), (11, "b", False)])
    q2 = _q(2, 2, QuestionType.SINGLE_CHOICE, options=[(20, "a", True), (21, "b", False)])
    res = grade([q1, q2], {1: TypedSelection(option_id=11), 2: TypedSelection(option_id=21)},
                50, negative_marks=1.0)
    assert res.obtained_marks == 0  # clamped, not -2
    assert res.incorrect_answers == 2
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && pytest tests/test_scoring.py -q`
Expected: FAIL — `TypedSelection` / new `grade` signature not defined.

- [ ] **Step 3: Rewrite scoring.py**

Replace `backend/app/services/scoring.py` with:

```python
"""Backend-authoritative scoring (never trusts the client)."""

from dataclasses import dataclass, field

from app.models.enums import QuestionType
from app.models.question import Question


@dataclass
class TypedSelection:
    option_id: int | None = None
    option_ids: list[int] | None = None
    text: str | None = None


@dataclass
class GradedAnswer:
    question_id: int
    selected_option_id: int | None = None
    selected_option_ids: list[int] | None = None
    text_answer: str | None = None
    is_correct: bool = False


@dataclass
class ScoreResult:
    total_questions: int
    correct_answers: int
    incorrect_answers: int
    unanswered: int
    total_marks: int
    obtained_marks: float
    percentage: float
    passed: bool
    graded_answers: list[GradedAnswer] = field(default_factory=list)


def _norm(s: str | None) -> str:
    return (s or "").strip().casefold()


def _is_answered(q: Question, sel: TypedSelection) -> bool:
    if q.question_type == QuestionType.FILL_BLANK:
        return bool(_norm(sel.text))
    if q.question_type == QuestionType.MULTIPLE_CHOICE:
        return bool(sel.option_ids)
    return sel.option_id is not None


def _is_correct(q: Question, sel: TypedSelection) -> bool:
    if q.question_type == QuestionType.FILL_BLANK:
        accepted = {_norm(a) for a in (q.accepted_answers or [])}
        return _norm(sel.text) in accepted
    correct_ids = {o.id for o in q.options if o.is_correct}
    if q.question_type == QuestionType.MULTIPLE_CHOICE:
        return set(sel.option_ids or []) == correct_ids
    return sel.option_id in correct_ids


def grade(
    questions: list[Question],
    selections: dict[int, TypedSelection],
    passing_score: int,
    *,
    negative_marks: float = 0.0,
) -> ScoreResult:
    correct = incorrect = unanswered = 0
    total_marks = 0
    raw = 0.0
    graded: list[GradedAnswer] = []

    for q in questions:
        total_marks += q.marks
        sel = selections.get(q.id) or TypedSelection()
        ga = GradedAnswer(
            question_id=q.id,
            selected_option_id=sel.option_id,
            selected_option_ids=sel.option_ids,
            text_answer=sel.text,
        )
        if not _is_answered(q, sel):
            unanswered += 1
        elif _is_correct(q, sel):
            correct += 1
            raw += q.marks
            ga.is_correct = True
        else:
            incorrect += 1
            raw -= negative_marks
        graded.append(ga)

    obtained = max(0.0, round(raw, 2))
    percentage = round((obtained / total_marks) * 100, 2) if total_marks else 0.0
    return ScoreResult(
        total_questions=len(questions),
        correct_answers=correct,
        incorrect_answers=incorrect,
        unanswered=unanswered,
        total_marks=total_marks,
        obtained_marks=obtained,
        percentage=percentage,
        passed=percentage >= passing_score,
        graded_answers=graded,
    )
```

- [ ] **Step 4: Run scoring tests**

Run: `cd backend && pytest tests/test_scoring.py -q`
Expected: PASS (new + existing). If existing tests call `grade` with the old dict-of-int shape, update them to wrap values in `TypedSelection(option_id=...)`.

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/scoring.py backend/tests/test_scoring.py
git commit -m "feat(scoring): per-type grading + fixed negative marking (all-or-nothing multi)"
```

---

### Task 4: Type-aware question create/update (router)

**Files:**
- Modify: `backend/app/routers/questions.py`
- Test: `backend/tests/test_api_flow.py`

**Interfaces:**
- Consumes: `QuestionCreate`/`QuestionUpdate` (Task 2).
- Produces: `POST /api/quizzes/:id/questions` and `PUT /api/questions/:id` persist `question_type`, `accepted_answers`, and options (empty for fill-blank).

- [ ] **Step 1: Write failing test creating each type**

Append to `backend/tests/test_api_flow.py` a test that logs in as faculty, creates a quiz, then POSTs a MULTIPLE_CHOICE question (two correct options), a TRUE_FALSE question (options True/False), and a FILL_BLANK question (`accepted_answers=["4"]`, no options), asserting each returns 201 with the echoed `question_type`. Follow the existing helper/auth pattern already used in that file.

- [ ] **Step 2: Run to verify failure**

Run: `cd backend && pytest tests/test_api_flow.py -q -k question`
Expected: FAIL (server ignores `question_type`/`accepted_answers`).

- [ ] **Step 3: Update create_question and update_question**

In `backend/app/routers/questions.py`, set the new fields on create (add after `difficulty=payload.difficulty,` and adjust options for fill-blank):

```python
    question = Question(
        quiz_id=quiz_id,
        question_text=payload.question_text,
        marks=payload.marks,
        explanation=payload.explanation,
        difficulty=payload.difficulty,
        question_type=payload.question_type,
        accepted_answers=payload.accepted_answers,
        source=QuestionSource.MANUAL,
        options=[
            Option(option_text=o.option_text, is_correct=o.is_correct)
            for o in (payload.options or [])
        ],
    )
```

In `update_question`, extend the copied-field loop to include the new scalar fields and handle accepted_answers:

```python
    for field in ("question_text", "marks", "explanation", "difficulty", "question_type"):
        if field in data:
            setattr(question, field, data[field])
    if "accepted_answers" in data:
        question.accepted_answers = data["accepted_answers"]
    if payload.options is not None:
        question.options = [
            Option(option_text=o.option_text, is_correct=o.is_correct) for o in payload.options
        ]
```

Import `QuestionType` is not needed here (payload carries the enum). Keep existing imports.

- [ ] **Step 4: Run tests**

Run: `cd backend && pytest tests/test_api_flow.py -q`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/routers/questions.py backend/tests/test_api_flow.py
git commit -m "feat(questions): persist question_type and accepted_answers"
```

---

### Task 5: Start-attempt eligibility + layout freeze / randomization

**Files:**
- Modify: `backend/app/routers/attempts.py`
- Test: `backend/tests/test_api_flow.py`

**Interfaces:**
- Consumes: `Quiz` scheduling/shuffle fields, `Attempt.layout`, `StartAttemptResponse` with `attempt_layout` + `question_type` (Tasks 1–2).
- Produces: `_build_layout(quiz, questions) -> dict`; `_ordered_questions(questions, layout) -> list[Question]`; start gates on availability and returns questions in frozen order.

- [ ] **Step 1: Write failing tests (schedule gate + stable order)**

Append to `backend/tests/test_api_flow.py`:
- A test creating a PUBLISHED quiz with `available_from` in the future → `POST /start` returns 403.
- A test with `available_until` in the past → 403.
- A test with `shuffle_questions=True` where two sequential `start` calls (resume) return the **same** question order (layout frozen). Use the existing student-auth pattern.

- [ ] **Step 2: Run to verify failure**

Run: `cd backend && pytest tests/test_api_flow.py -q -k "schedule or layout or order"`
Expected: FAIL (no gate; order not frozen).

- [ ] **Step 3: Add helpers + gating + layout to attempts.py**

Add imports at top: `import random` and `from app.models.enums import AttemptLayout` (extend the existing enums import line). Add helpers near `_expires_at`:

```python
def _build_layout(quiz: Quiz, questions: list[Question]) -> dict:
    qids = [q.id for q in questions]
    if quiz.shuffle_questions:
        random.shuffle(qids)
    options = {}
    for q in questions:
        oids = [o.id for o in q.options]
        if quiz.shuffle_options:
            random.shuffle(oids)
        options[str(q.id)] = oids
    return {"questions": qids, "options": options}


def _ordered(questions: list[Question], layout: dict | None) -> list[Question]:
    if not layout:
        return questions
    by_id = {q.id: q for q in questions}
    ordered = [by_id[qid] for qid in layout.get("questions", []) if qid in by_id]
    opt_order = layout.get("options", {})
    for q in ordered:
        order = opt_order.get(str(q.id))
        if order:
            pos = {oid: i for i, oid in enumerate(order)}
            q.options.sort(key=lambda o: pos.get(o.id, 0))
    return ordered
```

In `start_attempt`, after loading `quiz` and before/around the resume logic, add the schedule gate right after the 404 check:

```python
    now = _now()
    if quiz.available_from and now < quiz.available_from.replace(tzinfo=quiz.available_from.tzinfo or timezone.utc):
        raise HTTPException(status_code=403, detail="This quiz is not yet available")
    if quiz.available_until and now > quiz.available_until.replace(tzinfo=quiz.available_until.tzinfo or timezone.utc):
        raise HTTPException(status_code=403, detail="This quiz is no longer available")
```

When creating a new attempt, freeze the layout (load questions first so they exist). Restructure so `questions = _load_quiz_questions(...)` runs before the `if existing is None:` block, and set `existing.layout = _build_layout(quiz, questions)` on creation (before `db.commit()`). Then order for the response:

```python
    questions = _ordered(questions, existing.layout)
```

Finally update the response construction to pass `attempt_layout=quiz.attempt_layout` and per-question `question_type`, returning `options=[]` untouched (fill-blank already has none):

```python
    return StartAttemptResponse(
        attempt_id=existing.id,
        quiz_id=quiz.id,
        quiz_title=quiz.title,
        duration_minutes=quiz.duration_minutes,
        attempt_layout=quiz.attempt_layout,
        started_at=existing.started_at,
        expires_at=_expires_at(existing, quiz),
        questions=[
            AttemptQuestion(
                id=q.id,
                question_text=q.question_text,
                marks=q.marks,
                question_type=q.question_type,
                options=[AttemptOption(id=o.id, option_text=o.option_text) for o in q.options],
            )
            for q in questions
        ],
    )
```

- [ ] **Step 4: Run tests**

Run: `cd backend && pytest tests/test_api_flow.py -q`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/routers/attempts.py backend/tests/test_api_flow.py
git commit -m "feat(attempts): availability gate + frozen randomized layout"
```

---

### Task 6: Submit — typed answers + result review per type

**Files:**
- Modify: `backend/app/routers/attempts.py`
- Test: `backend/tests/test_api_flow.py`

**Interfaces:**
- Consumes: `scoring.grade(..., negative_marks=...)` + `TypedSelection` (Task 3), extended `SubmittedAnswer`/`AnswerReview` (Task 2), `Answer.selected_option_ids`/`.text_answer` (Task 1).
- Produces: submit persists typed answers and grades with negative marking; `_build_result` fills per-type review fields.

- [ ] **Step 1: Write failing end-to-end test**

Append to `backend/tests/test_api_flow.py` a test: faculty creates a quiz with `negative_marking_enabled=True, negative_marks_per_wrong=1`, adds a MULTIPLE_CHOICE (two correct) and a FILL_BLANK question, publishes; student starts, submits `selected_option_ids` for the multi and `text_answer` for the blank; assert the returned `AttemptResult.percentage` and per-question `review[i].is_correct` match all-or-nothing + normalized matching, and `review[i].question_type` is populated.

- [ ] **Step 2: Run to verify failure**

Run: `cd backend && pytest tests/test_api_flow.py -q -k submit`
Expected: FAIL.

- [ ] **Step 3: Build typed selections in submit_attempt**

In `submit_attempt`, replace the selections-building block with one that produces `TypedSelection` per question type. After computing `option_to_question`, add a map of question types (`qtype = {q.id: q.question_type for q in questions}`) and:

```python
    from app.services.scoring import TypedSelection

    selections: dict[int, TypedSelection] = {}
    for ans in payload.answers:
        if ans.question_id not in valid_question_ids:
            continue
        t = qtype[ans.question_id]
        if t == QuestionType.FILL_BLANK:
            selections[ans.question_id] = TypedSelection(text=ans.text_answer)
        elif t == QuestionType.MULTIPLE_CHOICE:
            clean = [oid for oid in (ans.selected_option_ids or [])
                     if option_to_question.get(oid) == ans.question_id]
            selections[ans.question_id] = TypedSelection(option_ids=clean)
        else:
            opt = ans.selected_option_id
            if opt is not None and option_to_question.get(opt) != ans.question_id:
                opt = None
            selections[ans.question_id] = TypedSelection(option_id=opt)

    result = scoring.grade(
        questions, selections, quiz.passing_score,
        negative_marks=quiz.negative_marks_per_wrong if quiz.negative_marking_enabled else 0.0,
    )
```

Add `QuestionType` to the enums import line. Update the `Answer(...)` persistence loop to store all three shapes:

```python
    for ga in result.graded_answers:
        db.add(Answer(
            attempt_id=attempt.id,
            question_id=ga.question_id,
            selected_option_id=ga.selected_option_id,
            selected_option_ids=ga.selected_option_ids,
            text_answer=ga.text_answer,
            is_correct=ga.is_correct,
        ))
```

- [ ] **Step 4: Extend `_build_result` review**

In `_build_result`, load the full answers (already done) and build maps for the list/text shapes:

```python
    selected_ids_by_q = {a.question_id: a.selected_option_ids for a in answers}
    text_by_q = {a.question_id: a.text_answer for a in answers}
```

In the per-question `review.append(AnswerReview(...))`, add:

```python
            question_type=q.question_type,
            correct_option_ids=[o.id for o in q.options if o.is_correct],
            accepted_answers=q.accepted_answers,
            selected_option_ids=selected_ids_by_q.get(q.id),
            text_answer=text_by_q.get(q.id),
```

(Keep existing `correct_option_id` = first correct option or None for the single-choice UI path.)

- [ ] **Step 5: Run full backend suite**

Run: `cd backend && pytest -q`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/app/routers/attempts.py backend/tests/test_api_flow.py
git commit -m "feat(attempts): typed submit persistence, negative marking, per-type review"
```

---

### Task 7: Frontend — quiz form fields + API wrappers

**Files:**
- Modify: `frontend/src/pages/faculty/QuizForm.jsx`
- Modify: `frontend/src/api/quizzes.js` (only if it strips fields; most wrappers pass the body through — verify)

**Interfaces:**
- Consumes: backend quiz fields from Task 2.
- Produces: quiz create/edit form sends `attempt_layout`, `negative_marking_enabled`, `negative_marks_per_wrong`, `shuffle_questions`, `shuffle_options`, `available_from`, `available_until`.

- [ ] **Step 1: Verify the quizzes API wrapper passes the body through**

Run: `sed -n '1,60p' frontend/src/api/quizzes.js` (dedicated read). If `create`/`update` forward the whole object (e.g. `client.post('/quizzes', data)`), no change is needed. If they cherry-pick fields, add the new keys.

- [ ] **Step 2: Add the fields to QuizForm**

In `frontend/src/pages/faculty/QuizForm.jsx`, add controlled state + inputs for the new fields (match the file's existing React-Hook-Form or useState pattern). Add a Select for `attempt_layout` with options `SCROLL` ("One long page") and `PAGED` ("One question per page"); checkboxes for `negative_marking_enabled`, `shuffle_questions`, `shuffle_options`; a number input for `negative_marks_per_wrong` (shown when negative marking is on); and two `datetime-local` inputs for `available_from`/`available_until` (send `null` when empty, ISO string otherwise). Include all in the submit payload.

- [ ] **Step 3: Manual check**

Run the frontend (`cd frontend && npm run dev`), open the faculty quiz create form, confirm the new controls render and a created quiz round-trips the values on edit.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/faculty/QuizForm.jsx frontend/src/api/quizzes.js
git commit -m "feat(frontend): quiz-form layout, negative-marking, shuffle, schedule fields"
```

---

### Task 8: Frontend — question editor type picker

**Files:**
- Modify: `frontend/src/components/quiz/QuestionForm.jsx`
- Modify: `frontend/src/components/quiz/OptionEditor.jsx`

**Interfaces:**
- Consumes: `question_type` + `accepted_answers` from Task 2.
- Produces: question create/edit sends `question_type`, `options` (choice types), `accepted_answers` (fill-blank).

- [ ] **Step 1: Make OptionEditor support single vs multiple correct**

Add a `multiple` prop to `OptionEditor`. When `multiple`, render checkboxes (toggle `is_correct` independently) instead of radios, and drop the "keep exactly one" logic (allow ≥1). Keep the 2–6 add/remove behavior. Header text: "Options (check all correct)" when `multiple`.

- [ ] **Step 2: Add the type picker + per-type controls to QuestionForm**

In `frontend/src/components/quiz/QuestionForm.jsx`:
- Add `type` state (default `initial?.question_type || "SINGLE_CHOICE"`) and a `Select` with the four types.
- Add `accepted` state (`initial?.accepted_answers || [""]`) with a small list editor (add/remove text rows) shown only for `FILL_BLANK`.
- For `TRUE_FALSE`, force `options` to `[{option_text:"True",is_correct:true},{option_text:"False",is_correct:false}]` and render a two-radio "which is correct" control (text not editable).
- For `SINGLE_CHOICE`, render `<OptionEditor>`; for `MULTIPLE_CHOICE`, render `<OptionEditor multiple>`.
- Update `submit()` validation per type (single: exactly one correct; multiple: ≥1; true/false: one of two; fill-blank: ≥1 non-empty accepted answer) and build the payload: choice types send `options` (+`question_type`), fill-blank sends `accepted_answers` and omits `options`.

- [ ] **Step 3: Manual check**

In the faculty Question Manager, create one question of each type and confirm they save and reload with the right control.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/quiz/QuestionForm.jsx frontend/src/components/quiz/OptionEditor.jsx
git commit -m "feat(frontend): question editor type picker + per-type controls"
```

---

### Task 9: Frontend — attempt UI (palette + scroll/paged + per-type controls)

**Files:**
- Modify: `frontend/src/components/quiz/AttemptQuestionCard.jsx`
- Create: `frontend/src/components/quiz/QuestionPalette.jsx`
- Modify: `frontend/src/pages/student/Attempt.jsx`

**Interfaces:**
- Consumes: `StartAttemptResponse` (`attempt_layout`, per-question `question_type`) from Task 5.
- Produces: submit payload items with `selected_option_id` / `selected_option_ids` / `text_answer` per type.

- [ ] **Step 1: Make AttemptQuestionCard render per type**

Rework `AttemptQuestionCard` to branch on `question.question_type`:
- `SINGLE_CHOICE`/`TRUE_FALSE`: radios (current behavior); `selected` is an option id.
- `MULTIPLE_CHOICE`: checkboxes; `selected` is an array of ids; `onSelect(qid, nextArray)` toggles.
- `FILL_BLANK`: a text `Input`; `selected` is a string; `onSelect(qid, text)`.
Keep the marks header. Accept an optional `forwardedRef` so the palette can scroll to it in scroll mode.

- [ ] **Step 2: Create QuestionPalette**

Create `frontend/src/components/quiz/QuestionPalette.jsx`: given `questions`, an `isAnswered(q)` predicate, `current` index, and `onJump(index)`, render a boxy grid of numbered cells — filled/violet when answered, outlined when not, ring on `current`. Used by both layouts.

- [ ] **Step 3: Rework Attempt.jsx state + answered logic**

Change `answers` to hold per-type values (id, array, or string). Add helper:

```js
const isAnswered = (q) => {
  const v = answers[q.id];
  if (q.question_type === "MULTIPLE_CHOICE") return Array.isArray(v) && v.length > 0;
  if (q.question_type === "FILL_BLANK") return typeof v === "string" && v.trim() !== "";
  return v != null;
};
```

Update `answeredCount` to `data.questions.filter(isAnswered).length` and build the submit payload per type:

```js
answers: data.questions.map((q) => {
  const v = answers[q.id];
  if (q.question_type === "MULTIPLE_CHOICE") return { question_id: q.id, selected_option_ids: v || [] };
  if (q.question_type === "FILL_BLANK") return { question_id: q.id, text_answer: v ?? "" };
  return { question_id: q.id, selected_option_id: v ?? null };
}),
```

- [ ] **Step 4: Render scroll vs paged**

Add `const paged = data.attempt_layout === "PAGED"` and a `current` index state. In **scroll** mode keep the `.map` (attach a ref per question for palette scroll). In **paged** mode render only `data.questions[current]` inside one `AttemptQuestionCard`, with Prev/Next buttons (`disabled` at ends) and "Question {current+1} of {n}"; show Submit when on the last page (the top-bar Submit stays available in both modes). Render `<QuestionPalette>` in the right column above the Scratchpad; `onJump` sets `current` (paged) or scrolls to the ref (scroll) and sets `activeQ`.

- [ ] **Step 5: Manual check**

Create a scroll quiz and a paged quiz (each with mixed question types), attempt both: palette marks answered correctly, paged Prev/Next works, answers survive navigation, timer auto-submit still fires, results page opens.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/quiz/AttemptQuestionCard.jsx frontend/src/components/quiz/QuestionPalette.jsx frontend/src/pages/student/Attempt.jsx
git commit -m "feat(frontend): attempt palette, scroll/paged layouts, per-type controls"
```

---

### Task 10: Frontend — per-type result review + scheduling badges

**Files:**
- Modify: `frontend/src/pages/student/Result.jsx`
- Modify: `frontend/src/pages/student/Browse.jsx`
- Modify: `frontend/src/pages/student/QuizDetail.jsx`

**Interfaces:**
- Consumes: extended `AnswerReview` (Task 6) and quiz `available_from`/`available_until` (Task 2).

- [ ] **Step 1: Per-type review in Result.jsx**

In the review list, branch on `review.question_type`:
- Single/True-False: current selected-vs-correct option highlighting (`correct_option_id`, `selected_option_id`).
- Multiple: highlight each option using `correct_option_ids` (correct) and `selected_option_ids` (chosen) — green for correct, red for chosen-but-wrong, mark missed correct ones.
- Fill-blank: show the student's `text_answer` and the list of `accepted_answers`, with correct/incorrect styling from `is_correct`.
Keep the score header (correct/incorrect/unanswered/%/status/time) and per-question marks/explanation.

- [ ] **Step 2: Scheduling badges in Browse + QuizDetail**

Add a small helper (inline or in `frontend/src/lib/format.js`) `scheduleState(quiz)` → `"UPCOMING" | "CLOSED" | "OPEN"` comparing `now` to `available_from`/`available_until`. In `Browse` quiz cards and on `QuizDetail`, show an "Upcoming" or "Closed" badge and disable the Start control unless `OPEN` (backend still enforces).

- [ ] **Step 3: Manual check**

Attempt one quiz of each type, verify the review renders correctly per type; create a quiz with a future `available_from` and confirm Browse shows "Upcoming" with Start disabled.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/student/Result.jsx frontend/src/pages/student/Browse.jsx frontend/src/pages/student/QuizDetail.jsx
git commit -m "feat(frontend): per-type result review + scheduling badges"
```

---

## Final verification

- [ ] `cd backend && pytest -q` — all green.
- [ ] Manual smoke (running backend + frontend, seeded admin): faculty creates one quiz per attempt layout containing all four question types (with negative marking + shuffle on one, a schedule window on another); student attempts each via the palette in both scroll and paged modes; results/review render per type with correct scoring including the negative-marking clamp; Browse shows Upcoming/Closed states.
- [ ] Update `FUTURE_WORK.md`: tick multiple-correct / true-false / fill-blank question types, negative marking, question & option randomization, quiz scheduling, and the question-navigation item; commit.
```
