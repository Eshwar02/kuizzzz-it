"""Bootstrap baseline data: the platform admin (and optional sample content).

Run with:  python -m app.seed
Idempotent — safe to run repeatedly.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.category import Category
from app.models.enums import UserRole, UserStatus
from app.models.user import User

DEFAULT_CATEGORIES = [
    ("HTML", "HyperText Markup Language"),
    ("CSS", "Cascading Style Sheets"),
    ("JavaScript", "JavaScript language and runtime"),
    ("React", "React.js library"),
    ("Node.js", "Node.js runtime"),
    ("Python", "Python language"),
    ("Java", "Java language"),
    ("Database", "Databases and SQL"),
    ("Computer Networks", "Networking fundamentals"),
    ("Cyber Security", "Security concepts"),
]


def seed_admin(db: Session) -> User:
    admin = db.scalar(select(User).where(User.email == settings.admin_email.lower()))
    if admin:
        print(f"Admin already exists: {admin.email}")
        return admin
    admin = User(
        name=settings.admin_name,
        email=settings.admin_email.lower(),
        password_hash=hash_password(settings.admin_password),
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    print(f"Created admin: {admin.email} (password from ADMIN_PASSWORD env)")
    return admin


def seed_categories(db: Session) -> None:
    existing = {c.name for c in db.scalars(select(Category)).all()}
    created = 0
    for name, description in DEFAULT_CATEGORIES:
        if name not in existing:
            db.add(Category(name=name, description=description))
            created += 1
    if created:
        db.commit()
    print(f"Categories: {created} created, {len(existing)} already present")


def main() -> None:
    db = SessionLocal()
    try:
        seed_admin(db)
        seed_categories(db)
    finally:
        db.close()
    print("Seed complete.")


if __name__ == "__main__":
    main()
