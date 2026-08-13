"""CSV question import.

Parses an uploaded CSV into validated ``QuestionCreate`` payloads. Supports all
current question types. See ``TEMPLATE_CSV`` for the exact column contract.

Columns (header row required, order-independent, case-insensitive):
    question_text   required
    question_type   single | multiple | truefalse | fillblank  (default: single)
    marks           positive int (default: 1)
    difficulty      easy | intermediate | hard  (default: intermediate)
    explanation     optional
    option1..option6  choice text (ignored for fillblank)
    correct         choice types: 1-based option number(s), comma-separated
                    (e.g. "2" or "1,3"); truefalse: TRUE/FALSE
    accepted        fillblank: accepted answers separated by | (pipe)
"""
from __future__ import annotations

import csv
import io

from app.models.enums import Difficulty, QuestionType
from app.schemas.question import OptionIn, QuestionCreate

MAX_OPTIONS = 6

_TYPE_ALIASES = {
    "single": QuestionType.SINGLE_CHOICE,
    "single_choice": QuestionType.SINGLE_CHOICE,
    "mcq": QuestionType.SINGLE_CHOICE,
    "multiple": QuestionType.MULTIPLE_CHOICE,
    "multiple_choice": QuestionType.MULTIPLE_CHOICE,
    "multi": QuestionType.MULTIPLE_CHOICE,
    "truefalse": QuestionType.TRUE_FALSE,
    "true_false": QuestionType.TRUE_FALSE,
    "tf": QuestionType.TRUE_FALSE,
    "fillblank": QuestionType.FILL_BLANK,
    "fill_blank": QuestionType.FILL_BLANK,
    "blank": QuestionType.FILL_BLANK,
}

_DIFF_ALIASES = {
    "easy": Difficulty.EASY,
    "intermediate": Difficulty.INTERMEDIATE,
    "medium": Difficulty.INTERMEDIATE,
    "hard": Difficulty.HARD,
}

TEMPLATE_CSV = (
    "question_text,question_type,marks,difficulty,explanation,"
    "option1,option2,option3,option4,correct,accepted\n"
    "What does HTML stand for?,single,1,easy,HTML = Hyper Text Markup Language,"
    "Hyper Text Markup Language,High Text Machine Language,Hyper Tool Multi Language,"
    "Home Tool Markup Language,1,\n"
    "Which are JavaScript frameworks?,multiple,2,intermediate,React and Vue are frameworks,"
    "React,Vue,HTML,CSS,\"1,2\",\n"
    "The DOM stands for Document Object Model.,truefalse,1,easy,,,,,,TRUE,\n"
    "Which method parses a JSON string?,fillblank,1,intermediate,JSON.parse converts text to object,"
    ",,,,,JSON.parse|JSON.parse()\n"
)


class RowError(Exception):
    pass


def _norm(key: str) -> str:
    return (key or "").strip().lower().replace(" ", "_")


def _parse_type(raw: str) -> QuestionType:
    key = _norm(raw) or "single"
    if key not in _TYPE_ALIASES:
        raise RowError(f"Unknown question_type '{raw}'")
    return _TYPE_ALIASES[key]


def _parse_difficulty(raw: str) -> Difficulty:
    key = _norm(raw) or "intermediate"
    if key not in _DIFF_ALIASES:
        raise RowError(f"Unknown difficulty '{raw}'")
    return _DIFF_ALIASES[key]


def _parse_marks(raw: str) -> int:
    raw = (raw or "").strip()
    if not raw:
        return 1
    try:
        marks = int(raw)
    except ValueError as exc:
        raise RowError(f"marks must be a whole number, got '{raw}'") from exc
    if marks < 1:
        raise RowError("marks must be >= 1")
    return marks


def _collect_options(row: dict[str, str]) -> list[str]:
    opts: list[str] = []
    for i in range(1, MAX_OPTIONS + 1):
        val = (row.get(f"option{i}") or "").strip()
        if val:
            opts.append(val)
    return opts


def _correct_indices(raw: str, n_options: int) -> set[int]:
    raw = (raw or "").strip()
    if not raw:
        raise RowError("correct is required for choice questions")
    idxs: set[int] = set()
    for part in raw.split(","):
        part = part.strip()
        if not part:
            continue
        try:
            n = int(part)
        except ValueError as exc:
            raise RowError(f"correct must be option number(s), got '{part}'") from exc
        if not 1 <= n <= n_options:
            raise RowError(f"correct index {n} out of range (1..{n_options})")
        idxs.add(n)
    if not idxs:
        raise RowError("correct is required for choice questions")
    return idxs


def _row_to_question(row: dict[str, str]) -> QuestionCreate:
    text = (row.get("question_text") or "").strip()
    if not text:
        raise RowError("question_text is required")
    qtype = _parse_type(row.get("question_type", ""))
    marks = _parse_marks(row.get("marks", ""))
    difficulty = _parse_difficulty(row.get("difficulty", ""))
    explanation = (row.get("explanation") or "").strip() or None

    if qtype == QuestionType.FILL_BLANK:
        raw_accepted = row.get("accepted") or row.get("accepted_answers") or ""
        accepted = [a.strip() for a in raw_accepted.split("|") if a.strip()]
        if not accepted:
            raise RowError("fillblank needs 'accepted' answers separated by |")
        return QuestionCreate(
            question_text=text, marks=marks, difficulty=difficulty,
            explanation=explanation, question_type=qtype, accepted_answers=accepted,
        )

    if qtype == QuestionType.TRUE_FALSE:
        raw = _norm(row.get("correct", ""))
        if raw in ("true", "t", "1"):
            true_correct = True
        elif raw in ("false", "f", "0"):
            true_correct = False
        else:
            raise RowError("truefalse 'correct' must be TRUE or FALSE")
        options = [
            OptionIn(option_text="True", is_correct=true_correct),
            OptionIn(option_text="False", is_correct=not true_correct),
        ]
        return QuestionCreate(
            question_text=text, marks=marks, difficulty=difficulty,
            explanation=explanation, question_type=qtype, options=options,
        )

    # SINGLE_CHOICE / MULTIPLE_CHOICE
    texts = _collect_options(row)
    if len(texts) < 2:
        raise RowError("choice questions need at least two options (option1, option2, ...)")
    correct = _correct_indices(row.get("correct", ""), len(texts))
    if qtype == QuestionType.SINGLE_CHOICE and len(correct) != 1:
        raise RowError("single-choice needs exactly one correct option")
    options = [
        OptionIn(option_text=t, is_correct=(i + 1) in correct) for i, t in enumerate(texts)
    ]
    return QuestionCreate(
        question_text=text, marks=marks, difficulty=difficulty,
        explanation=explanation, question_type=qtype, options=options,
    )


def parse_csv(content: bytes) -> tuple[list[QuestionCreate], list[dict]]:
    """Return (questions, errors). ``errors`` items are {row, message}."""
    text = content.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(text))
    if reader.fieldnames is None:
        return [], [{"row": 0, "message": "CSV is empty or has no header row"}]
    # Normalise headers so "Question Text" == "question_text".
    reader.fieldnames = [_norm(f) for f in reader.fieldnames]
    if "question_text" not in reader.fieldnames:
        return [], [{"row": 0, "message": "Missing required 'question_text' column"}]

    questions: list[QuestionCreate] = []
    errors: list[dict] = []
    for i, raw_row in enumerate(reader, start=2):  # row 1 is the header
        row = {_norm(k): (v or "") for k, v in raw_row.items() if k is not None}
        if not any(v.strip() for v in row.values()):
            continue  # skip blank lines
        try:
            questions.append(_row_to_question(row))
        except RowError as exc:
            errors.append({"row": i, "message": str(exc)})
        except ValueError as exc:  # pydantic validation
            errors.append({"row": i, "message": str(exc)})
    return questions, errors
