from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import UserRole, UserStatus


class UserWithStats(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    role: UserRole
    status: UserStatus
    created_at: datetime
    quizzes_attempted: int = 0
    average_score: float = 0.0
    highest_score: float = 0.0


class AdminDashboard(BaseModel):
    total_students: int
    total_faculty: int
    total_quizzes: int
    published_quizzes: int
    draft_quizzes: int
    total_questions: int
    total_attempts: int
    average_score: float
    passed_attempts: int
    failed_attempts: int


class CountPoint(BaseModel):
    label: str
    value: float


class AdminAnalytics(BaseModel):
    attempts_over_time: list[CountPoint]
    registrations_over_time: list[CountPoint]
    pass_fail: list[CountPoint]
    popular_quizzes: list[CountPoint]
    popular_categories: list[CountPoint]


class RecentAttempt(BaseModel):
    attempt_id: int
    quiz_title: str
    percentage: float
    status: str
    completed_at: datetime | None


class StudentDashboard(BaseModel):
    total_attempted: int
    passed: int
    failed: int
    average_score: float
    highest_score: float
    total_questions_answered: int
    recent_attempts: list[RecentAttempt]


class FacultyDashboard(BaseModel):
    total_quizzes: int
    published_quizzes: int
    draft_quizzes: int
    total_questions: int
    ai_generated_questions: int
    total_attempts_on_my_quizzes: int
    average_score_on_my_quizzes: float


class LeaderboardEntry(BaseModel):
    rank: int
    user_id: int
    name: str
    average_score: float
    quizzes_completed: int
    highest_score: float
