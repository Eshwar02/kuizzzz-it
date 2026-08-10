from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session

from app.core.deps import require_role
from app.db.session import get_db
from app.models.ai_job import AIGenerationJob
from app.models.enums import (
    AIJobMode,
    AIJobStatus,
    Difficulty,
    QuestionSource,
    UserRole,
)
from app.models.question import Option, Question
from app.models.user import User
from app.schemas.ai import AIJobOut, ApproveRequest
from app.services import ai_service
from app.services.authz import ensure_can_manage_quiz
from app.services.pdf_extract import extract_text_from_pdf

router = APIRouter(prefix="/api/ai", tags=["ai"])

FacultyOrAdmin = require_role(UserRole.FACULTY, UserRole.ADMIN)


def _get_job_or_404(db: Session, job_id: int, user: User) -> AIGenerationJob:
    job = db.get(AIGenerationJob, job_id)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    if job.faculty_id != user.id and user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not your generation job"
        )
    return job


@router.post("/generate", response_model=AIJobOut, status_code=status.HTTP_201_CREATED)
async def generate(
    mode: AIJobMode = Form(...),
    topics: str = Form(""),
    class_level: str = Form(""),
    difficulty: Difficulty = Form(Difficulty.INTERMEDIATE),
    num_questions: int = Form(5, ge=1, le=20),
    quiz_id: int | None = Form(None),
    file: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    user: User = Depends(FacultyOrAdmin),
) -> AIGenerationJob:
    if quiz_id is not None:
        from app.models.quiz import Quiz  # local import to avoid cycle

        quiz = db.get(Quiz, quiz_id)
        if quiz is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")
        ensure_can_manage_quiz(user, quiz)

    material_text: str | None = None
    if mode == AIJobMode.PDF:
        if file is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A PDF file is required for PDF mode",
            )
        data = await file.read()
        material_text = extract_text_from_pdf(data)
        if not material_text:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not extract any text from the PDF",
            )
    elif not topics:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Topics are required for topic mode",
        )

    job = AIGenerationJob(
        faculty_id=user.id,
        quiz_id=quiz_id,
        mode=mode,
        inputs={
            "topics": topics,
            "class_level": class_level,
            "difficulty": difficulty.value,
            "num_questions": num_questions,
            "source_filename": file.filename if file else None,
        },
        model=ai_service.settings.mistral_model,
        status=AIJobStatus.PENDING,
    )
    db.add(job)
    db.flush()

    try:
        drafts = ai_service.generate_questions(
            material_text=material_text,
            topics=topics,
            class_level=class_level,
            difficulty=difficulty,
            num_questions=num_questions,
        )
        job.draft_questions = [d.model_dump() for d in drafts]
        job.status = AIJobStatus.COMPLETED
    except ai_service.AIServiceError as exc:
        job.status = AIJobStatus.FAILED
        job.error = str(exc)
        db.commit()
        db.refresh(job)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))

    db.commit()
    db.refresh(job)
    return job


@router.get("/jobs/{job_id}", response_model=AIJobOut)
def get_job(
    job_id: int, db: Session = Depends(get_db), user: User = Depends(FacultyOrAdmin)
) -> AIGenerationJob:
    return _get_job_or_404(db, job_id, user)


@router.post("/jobs/{job_id}/approve", status_code=status.HTTP_201_CREATED)
def approve_job(
    job_id: int,
    payload: ApproveRequest,
    db: Session = Depends(get_db),
    user: User = Depends(FacultyOrAdmin),
) -> dict:
    from app.models.quiz import Quiz  # local import to avoid cycle

    job = _get_job_or_404(db, job_id, user)
    quiz = db.get(Quiz, payload.quiz_id)
    if quiz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")
    ensure_can_manage_quiz(user, quiz)

    created = 0
    for draft in payload.questions:
        question = Question(
            quiz_id=quiz.id,
            question_text=draft.question_text,
            marks=draft.marks,
            explanation=draft.explanation,
            difficulty=draft.difficulty,
            source=QuestionSource.AI,
            options=[
                Option(option_text=o.option_text, is_correct=o.is_correct)
                for o in draft.options
            ],
        )
        db.add(question)
        created += 1

    job.status = AIJobStatus.APPROVED
    job.quiz_id = quiz.id
    db.commit()
    return {"detail": "Questions added", "created": created, "quiz_id": quiz.id}
