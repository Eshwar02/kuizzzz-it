from app.models.enums import QuestionType
from app.models.question import Option, Question
from app.services import scoring
from app.services.scoring import TypedSelection


def _q(qid: int, marks: int, correct_option_id: int, option_ids: list[int]) -> Question:
    q = Question(
        id=qid,
        quiz_id=1,
        question_text=f"q{qid}",
        marks=marks,
        question_type=QuestionType.SINGLE_CHOICE,
    )
    q.options = [
        Option(id=oid, question_id=qid, option_text=f"o{oid}", is_correct=(oid == correct_option_id))
        for oid in option_ids
    ]
    return q


def _sel(option_id: int) -> TypedSelection:
    return TypedSelection(option_id=option_id)


def test_all_correct():
    questions = [_q(1, 2, 11, [11, 12]), _q(2, 1, 21, [21, 22])]
    result = scoring.grade(questions, {1: _sel(11), 2: _sel(21)}, passing_score=60)
    assert result.correct_answers == 2
    assert result.incorrect_answers == 0
    assert result.unanswered == 0
    assert result.obtained_marks == 3
    assert result.total_marks == 3
    assert result.percentage == 100.0
    assert result.passed is True


def test_mixed_with_unanswered():
    questions = [_q(1, 2, 11, [11, 12]), _q(2, 1, 21, [21, 22]), _q(3, 1, 31, [31, 32])]
    result = scoring.grade(questions, {1: _sel(11), 2: _sel(22)}, passing_score=60)
    assert result.correct_answers == 1
    assert result.incorrect_answers == 1
    assert result.unanswered == 1
    assert result.obtained_marks == 2
    assert result.total_marks == 4
    assert result.percentage == 50.0
    assert result.passed is False


def test_passing_boundary_inclusive():
    questions = [_q(1, 1, 11, [11, 12]), _q(2, 1, 21, [21, 22])]
    result = scoring.grade(questions, {1: _sel(11)}, passing_score=50)
    assert result.percentage == 50.0
    assert result.passed is True


def test_spoofed_option_counts_as_wrong():
    questions = [_q(1, 1, 11, [11, 12])]
    result = scoring.grade(questions, {1: _sel(999)}, passing_score=1)
    assert result.correct_answers == 0
    assert result.incorrect_answers == 1


def _qt(qid, marks, qtype, options=None, accepted=None) -> Question:
    q = Question(
        id=qid,
        quiz_id=1,
        question_text="q",
        marks=marks,
        question_type=qtype,
        accepted_answers=accepted,
    )
    q.options = [
        Option(id=oid, question_id=qid, option_text=t, is_correct=c)
        for (oid, t, c) in (options or [])
    ]
    return q


def test_multiple_choice_all_or_nothing():
    q = _qt(
        1, 2, QuestionType.MULTIPLE_CHOICE,
        options=[(10, "a", True), (11, "b", True), (12, "c", False)],
    )
    exact = scoring.grade([q], {1: TypedSelection(option_ids=[10, 11])}, 50)
    assert exact.obtained_marks == 2 and exact.correct_answers == 1
    partial = scoring.grade([q], {1: TypedSelection(option_ids=[10])}, 50)
    assert partial.obtained_marks == 0 and partial.incorrect_answers == 1


def test_true_false_correct():
    q = _qt(1, 1, QuestionType.TRUE_FALSE, options=[(10, "True", True), (11, "False", False)])
    assert scoring.grade([q], {1: TypedSelection(option_id=10)}, 50).correct_answers == 1
    assert scoring.grade([q], {1: TypedSelection(option_id=11)}, 50).incorrect_answers == 1


def test_fill_blank_normalized_match():
    q = _qt(1, 1, QuestionType.FILL_BLANK, accepted=["Paris", "paris city"])
    ok = scoring.grade([q], {1: TypedSelection(text="  paris  ")}, 50)
    assert ok.correct_answers == 1 and ok.obtained_marks == 1
    bad = scoring.grade([q], {1: TypedSelection(text="london")}, 50)
    assert bad.incorrect_answers == 1


def test_negative_marking_clamps_at_zero():
    q1 = _qt(1, 2, QuestionType.SINGLE_CHOICE, options=[(10, "a", True), (11, "b", False)])
    q2 = _qt(2, 2, QuestionType.SINGLE_CHOICE, options=[(20, "a", True), (21, "b", False)])
    res = scoring.grade(
        [q1, q2],
        {1: TypedSelection(option_id=11), 2: TypedSelection(option_id=21)},
        50,
        negative_marks=1.0,
    )
    assert res.obtained_marks == 0  # clamped, not -2
    assert res.incorrect_answers == 2
