"""Backend-authoritative scoring.

The frontend never computes scores or learns which option is correct during an
attempt. This module grades a submission purely from persisted question data,
branching per question type, with optional fixed-value negative marking.
"""

from dataclasses import dataclass, field

from app.models.enums import QuestionType
from app.models.question import Question


@dataclass
class TypedSelection:
    """A student's answer for one question, shaped by the question type."""

    option_id: int | None = None          # SINGLE_CHOICE / TRUE_FALSE
    option_ids: list[int] | None = None    # MULTIPLE_CHOICE
    text: str | None = None                # FILL_BLANK


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
    """Grade typed selections. `selections` maps question_id -> TypedSelection."""
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
