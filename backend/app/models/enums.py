import enum


class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    FACULTY = "FACULTY"
    STUDENT = "STUDENT"


class UserStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"


class QuizStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    UNPUBLISHED = "UNPUBLISHED"


class Difficulty(str, enum.Enum):
    EASY = "EASY"
    INTERMEDIATE = "INTERMEDIATE"
    HARD = "HARD"


class QuestionSource(str, enum.Enum):
    MANUAL = "MANUAL"
    AI = "AI"


class AttemptStatus(str, enum.Enum):
    IN_PROGRESS = "IN_PROGRESS"
    PASSED = "PASSED"
    FAILED = "FAILED"


class AIJobMode(str, enum.Enum):
    PDF = "PDF"
    TOPIC = "TOPIC"


class AIJobStatus(str, enum.Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    APPROVED = "APPROVED"


class QuestionType(str, enum.Enum):
    SINGLE_CHOICE = "SINGLE_CHOICE"
    MULTIPLE_CHOICE = "MULTIPLE_CHOICE"
    TRUE_FALSE = "TRUE_FALSE"
    FILL_BLANK = "FILL_BLANK"


class AttemptLayout(str, enum.Enum):
    SCROLL = "SCROLL"
    PAGED = "PAGED"


class QuizVisibility(str, enum.Enum):
    OPEN = "OPEN"
    ASSIGNED = "ASSIGNED"
