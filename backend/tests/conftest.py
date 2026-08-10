"""Test harness.

Each test runs inside a database transaction that is rolled back at teardown,
so tests never pollute the development database. The seeded admin/categories
(committed outside the test transaction) remain visible for login.
"""

import json

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.db.session import engine, get_db
from app.main import app
from app.models.enums import UserRole, UserStatus
from app.models.user import User


@pytest.fixture()
def db_connection():
    connection = engine.connect()
    trans = connection.begin()
    yield connection
    trans.rollback()
    connection.close()


@pytest.fixture()
def db(db_connection) -> Session:
    session = Session(bind=db_connection, join_transaction_mode="create_savepoint")
    yield session
    session.close()


@pytest.fixture()
def client(db) -> TestClient:
    def _get_db_override():
        yield db

    app.dependency_overrides[get_db] = _get_db_override
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def make_user(db):
    """Factory: create an active user of any role and return it."""

    def _make(email: str, role: UserRole, password: str = "password123") -> User:
        user = User(
            name=email.split("@")[0],
            email=email.lower(),
            password_hash=hash_password(password),
            role=role,
            status=UserStatus.ACTIVE,
        )
        db.add(user)
        db.flush()
        return user

    return _make


@pytest.fixture()
def auth(client):
    """Helper to produce an Authorization header for given credentials."""

    def _auth(email: str, password: str = "password123") -> dict:
        resp = client.post("/api/auth/login", json={"email": email, "password": password})
        assert resp.status_code == 200, resp.text
        return {"Authorization": f"Bearer {resp.json()['access_token']}"}

    return _auth


@pytest.fixture()
def fake_mistral(monkeypatch):
    """Patch the Mistral network call to return deterministic questions."""

    def _fake(prompt: str) -> str:
        return json.dumps(
            {
                "questions": [
                    {
                        "question_text": "What is 2+2?",
                        "options": [
                            {"option_text": "3", "is_correct": False},
                            {"option_text": "4", "is_correct": True},
                            {"option_text": "5", "is_correct": False},
                            {"option_text": "6", "is_correct": False},
                        ],
                        "explanation": "Basic arithmetic.",
                        "marks": 1,
                    }
                ]
            }
        )

    from app.services import ai_service

    monkeypatch.setattr(ai_service, "_call_mistral", _fake)
