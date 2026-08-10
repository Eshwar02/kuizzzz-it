"""AI question generation via the Mistral API.

The single network call lives in `_call_mistral` so tests can monkeypatch it
without hitting the network. `generate_questions` builds the prompt, invokes the
model, and returns normalized draft questions validated against `DraftQuestion`.
"""

import json

from app.core.config import settings
from app.models.enums import Difficulty
from app.schemas.ai import DraftQuestion


class AIServiceError(Exception):
    """Raised when generation cannot be completed."""


SYSTEM_PROMPT = (
    "You are an expert exam author. Generate high-quality multiple-choice questions. "
    "Return ONLY valid JSON, no prose."
)

JSON_SHAPE = (
    '{"questions": [{"question_text": str, "options": [{"option_text": str, '
    '"is_correct": bool}], "explanation": str, "marks": int}]}'
)


def _build_prompt(
    *,
    material_text: str | None,
    topics: str,
    class_level: str,
    difficulty: Difficulty,
    num_questions: int,
) -> str:
    lines = [
        f"Generate {num_questions} multiple-choice questions.",
        f"Class / level: {class_level or 'general'}.",
        f"Topics: {topics or 'as covered in the material'}.",
        f"Difficulty: {difficulty.value}.",
        "Each question must have exactly 4 options and exactly ONE correct option.",
        "Include a concise explanation for the correct answer and integer marks (default 1).",
        f"Respond as JSON matching this shape: {JSON_SHAPE}",
    ]
    if material_text:
        lines.append(
            "Base the questions strictly on the following material:\n\n"
            f"\"\"\"\n{material_text}\n\"\"\""
        )
    return "\n".join(lines)


def _call_mistral(prompt: str) -> str:
    """Call the Mistral chat API and return the raw text response."""
    if not settings.mistral_api_key:
        raise AIServiceError(
            "MISTRAL_API_KEY is not configured. Set it in the backend .env to use AI generation."
        )
    from mistralai import Mistral  # imported lazily so the app runs without the key

    client = Mistral(api_key=settings.mistral_api_key)
    response = client.chat.complete(
        model=settings.mistral_model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        response_format={"type": "json_object"},
        temperature=0.4,
    )
    return response.choices[0].message.content or ""


def _parse_questions(raw: str) -> list[DraftQuestion]:
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise AIServiceError(f"Model did not return valid JSON: {exc}") from exc

    items = data.get("questions") if isinstance(data, dict) else data
    if not isinstance(items, list) or not items:
        raise AIServiceError("Model response contained no questions")

    drafts: list[DraftQuestion] = []
    for item in items:
        try:
            drafts.append(DraftQuestion.model_validate(item))
        except Exception:  # noqa: BLE001 - skip malformed items, keep valid ones
            continue
    if not drafts:
        raise AIServiceError("No valid questions could be parsed from the model response")
    return drafts


def generate_questions(
    *,
    material_text: str | None,
    topics: str,
    class_level: str,
    difficulty: Difficulty,
    num_questions: int,
) -> list[DraftQuestion]:
    prompt = _build_prompt(
        material_text=material_text,
        topics=topics,
        class_level=class_level,
        difficulty=difficulty,
        num_questions=num_questions,
    )
    raw = _call_mistral(prompt)
    drafts = _parse_questions(raw)
    # Honor the faculty-selected difficulty for every generated question.
    for draft in drafts:
        draft.difficulty = difficulty
    return drafts
