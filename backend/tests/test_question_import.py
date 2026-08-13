"""CSV question-import tests."""

from app.models.enums import UserRole
from app.services.question_import import TEMPLATE_CSV, parse_csv


def test_parse_template_covers_all_types():
    questions, errors = parse_csv(TEMPLATE_CSV.encode())
    assert errors == []
    types = {q.question_type.value for q in questions}
    assert types == {"SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE", "FILL_BLANK"}


def test_parse_reports_row_errors_but_keeps_valid_rows():
    csv = (
        "question_text,question_type,correct,option1,option2\n"
        ",single,1,a,b\n"                # missing text -> error row 2
        "Valid?,single,,a,b\n"           # missing correct -> error row 3
        "Multi,multiple,\"1,2\",a,b\n"   # ok
    )
    questions, errors = parse_csv(csv.encode())
    assert len(questions) == 1
    rows = {e["row"] for e in errors}
    assert rows == {2, 3}


def _make_quiz(client, headers):
    cat_id = client.get("/api/categories", headers=headers).json()[0]["id"]
    resp = client.post(
        "/api/quizzes",
        json={
            "title": "Import Target",
            "description": "d",
            "category_id": cat_id,
            "duration": 10,
            "passing_score": 50,
            "max_attempts": 1,
        },
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


def test_import_endpoint_creates_questions(client, make_user, auth):
    make_user("importer@t.com", UserRole.FACULTY)
    headers = auth("importer@t.com")
    quiz_id = _make_quiz(client, headers)

    resp = client.post(
        f"/api/quizzes/{quiz_id}/questions/import",
        files={"file": ("q.csv", TEMPLATE_CSV, "text/csv")},
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["created"] == 4
    assert body["errors"] == []

    listed = client.get(f"/api/quizzes/{quiz_id}/questions", headers=headers).json()
    assert len(listed) == 4


def test_import_rejected_for_non_owner_faculty(client, make_user, auth):
    make_user("owner@t.com", UserRole.FACULTY)
    make_user("intruder@t.com", UserRole.FACULTY)
    owner_headers = auth("owner@t.com")
    quiz_id = _make_quiz(client, owner_headers)

    intruder_headers = auth("intruder@t.com")
    resp = client.post(
        f"/api/quizzes/{quiz_id}/questions/import",
        files={"file": ("q.csv", TEMPLATE_CSV, "text/csv")},
        headers=intruder_headers,
    )
    assert resp.status_code == 403
