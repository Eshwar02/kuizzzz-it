from app.models.question import Option, Question
from app.services import scoring


def _q(qid: int, marks: int, correct_option_id: int, option_ids: list[int]) -> Question:
    q = Question(id=qid, quiz_id=1, question_text=f"q{qid}", marks=marks)
    q.options = [
        Option(id=oid, question_id=qid, option_text=f"o{oid}", is_correct=(oid == correct_option_id))
        for oid in option_ids
    ]
    return q


def test_all_correct():
    questions = [_q(1, 2, 11, [11, 12]), _q(2, 1, 21, [21, 22])]
    result = scoring.grade(questions, {1: 11, 2: 21}, passing_score=60)
    assert result.correct_answers == 2
    assert result.incorrect_answers == 0
    assert result.unanswered == 0
    assert result.obtained_marks == 3
    assert result.total_marks == 3
    assert result.percentage == 100.0
    assert result.passed is True


def test_mixed_with_unanswered():
    questions = [_q(1, 2, 11, [11, 12]), _q(2, 1, 21, [21, 22]), _q(3, 1, 31, [31, 32])]
    # q1 correct (2), q2 wrong, q3 unanswered
    result = scoring.grade(questions, {1: 11, 2: 22}, passing_score=60)
    assert result.correct_answers == 1
    assert result.incorrect_answers == 1
    assert result.unanswered == 1
    assert result.obtained_marks == 2
    assert result.total_marks == 4
    assert result.percentage == 50.0
    assert result.passed is False


def test_passing_boundary_inclusive():
    questions = [_q(1, 1, 11, [11, 12]), _q(2, 1, 21, [21, 22])]
    result = scoring.grade(questions, {1: 11}, passing_score=50)  # 50% == passing
    assert result.percentage == 50.0
    assert result.passed is True


def test_spoofed_option_counts_as_wrong():
    questions = [_q(1, 1, 11, [11, 12])]
    result = scoring.grade(questions, {1: 999}, passing_score=1)
    assert result.correct_answers == 0
    assert result.incorrect_answers == 1
