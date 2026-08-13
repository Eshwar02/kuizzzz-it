"""Certificate-generation endpoint tests."""

from app.models.enums import UserRole


def _make_published_quiz(client, fac_headers, *, passing=60):
    quiz_id = client.post(
        "/api/quizzes",
        json={"title": "Cert Quiz", "duration_minutes": 10, "passing_score": passing},
        headers=fac_headers,
    ).json()["id"]
    opts = [{"option_text": f"o{i}", "is_correct": i == 0} for i in range(4)]
    client.post(
        f"/api/quizzes/{quiz_id}/questions",
        json={"question_text": "q1", "marks": 1, "difficulty": "EASY", "options": opts},
        headers=fac_headers,
    )
    client.patch(
        f"/api/quizzes/{quiz_id}/publish", json={"status": "PUBLISHED"}, headers=fac_headers
    )
    return quiz_id


def _attempt(client, st_headers, quiz_id, *, correct):
    start = client.post(f"/api/quizzes/{quiz_id}/start", headers=st_headers).json()
    q = start["questions"][0]
    # Options are unshuffled by default; index 0 is the correct one (is_correct i==0).
    pick = q["options"][0]["id"] if correct else q["options"][1]["id"]
    resp = client.post(
        f"/api/quizzes/{quiz_id}/submit",
        json={"attempt_id": start["attempt_id"], "answers": [{"question_id": q["id"], "selected_option_id": pick}]},
        headers=st_headers,
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


def test_certificate_available_for_passed_attempt(client, make_user, auth):
    make_user("cfac@test.com", UserRole.FACULTY)
    make_user("cst@test.com", UserRole.STUDENT)
    fac, st = auth("cfac@test.com"), auth("cst@test.com")
    quiz_id = _make_published_quiz(client, fac)
    result = _attempt(client, st, quiz_id, correct=True)
    assert result["status"] == "PASSED"

    r = client.get(f"/api/attempts/{result['id']}/certificate", headers=st)
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"
    assert r.content[:5] == b"%PDF-"
    assert "attachment" in r.headers["content-disposition"]


def test_certificate_blocked_for_failed_attempt(client, make_user, auth):
    make_user("cfac2@test.com", UserRole.FACULTY)
    make_user("cst2@test.com", UserRole.STUDENT)
    fac, st = auth("cfac2@test.com"), auth("cst2@test.com")
    quiz_id = _make_published_quiz(client, fac)
    result = _attempt(client, st, quiz_id, correct=False)
    assert result["status"] == "FAILED"

    r = client.get(f"/api/attempts/{result['id']}/certificate", headers=st)
    assert r.status_code == 409


def test_certificate_not_leaked_to_other_student(client, make_user, auth):
    make_user("cfac3@test.com", UserRole.FACULTY)
    make_user("owner@test.com", UserRole.STUDENT)
    make_user("other@test.com", UserRole.STUDENT)
    fac = auth("cfac3@test.com")
    quiz_id = _make_published_quiz(client, fac)
    result = _attempt(client, auth("owner@test.com"), quiz_id, correct=True)

    r = client.get(f"/api/attempts/{result['id']}/certificate", headers=auth("other@test.com"))
    assert r.status_code == 403
