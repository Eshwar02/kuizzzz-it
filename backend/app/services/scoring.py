"""Backend-authoritative scoring.

The frontend never computes scores or learns which option is correct during an
attempt. This module grades a submission purely from persisted question data.
"""

from dataclasses import dataclass, field

from app.models.question import Question


@dataclass
class GradedAnswer:
    question_id: int
    selected_option_id: int | None
    is_correct: bool


@dataclass
class ScoreResult:
    total_questions: int
    correct_answers: int
    incorrect_answers: int
    unanswered: int
    total_marks: int
    obtained_marks: int
    percentage: float
    passed: bool
    graded_answers: list[GradedAnswer] = field(default_factory=list)


def grade(
    questions: list[Question],
    selections: dict[int, int | None],
    passing_score: int,
) -> ScoreResult:
    """Grade a set of question selections.

    `selections` maps question_id -> selected_option_id (or None/absent).
    """
    correct = incorrect = unanswered = 0
    total_marks = obtained_marks = 0
    graded: list[GradedAnswer] = []

    for question in questions:
        total_marks += question.marks
        selected_id = selections.get(question.id)
        correct_option_ids = {o.id for o in question.options if o.is_correct}

        if selected_id is None:
            unanswered += 1
            graded.append(GradedAnswer(question.id, None, False))
            continue

        is_correct = selected_id in correct_option_ids
        if is_correct:
            correct += 1
            obtained_marks += question.marks
        else:
            incorrect += 1
        graded.append(GradedAnswer(question.id, selected_id, is_correct))

    percentage = round((obtained_marks / total_marks) * 100, 2) if total_marks else 0.0
    passed = percentage >= passing_score

    return ScoreResult(
        total_questions=len(questions),
        correct_answers=correct,
        incorrect_answers=incorrect,
        unanswered=unanswered,
        total_marks=total_marks,
        obtained_marks=obtained_marks,
        percentage=percentage,
        passed=passed,
        graded_answers=graded,
    )
