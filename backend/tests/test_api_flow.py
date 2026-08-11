"""End-to-end backend data-flow tests across all three roles."""

from app.models.enums import UserRole


def _make_quiz_with_questions(client, fac_headers, *, passing=60, max_attempts=1):
    quiz_id = client.post(
        "/api/quizzes",
        json={
            "title": "Flow Quiz",
            "duration_minutes": 10,
            "passing_score": passing,
            "max_attempts": max_attempts,
        },
        headers=fac_headers,
    ).json()["id"]

    def add_q(text, correct_idx, marks=1):
        opts = [{"option_text": f"o{i}", "is_correct": i == correct_idx} for i in range(4)]
        return client.post(
            f"/api/quizzes/{quiz_id}/questions",
            json={"question_text": text, "marks": marks, "difficulty": "EASY", "options": opts},
            headers=fac_headers,
        ).json()

    q1 = add_q("q1", 1, marks=2)
    q2 = add_q("q2", 0)
    q3 = add_q("q3", 2)
    client.patch(
        f"/api/quizzes/{quiz_id}/publish", json={"status": "PUBLISHED"}, headers=fac_headers
    )
    return quiz_id, (q1, q2, q3)


# ---------- Auth & RBAC ----------
def test_login_returns_client_ip(client, make_user):
    make_user("iptest@test.com", UserRole.STUDENT)
    resp = client.post("/api/auth/login", json={"email": "iptest@test.com", "password": "password123"})
    assert resp.status_code == 200
    body = resp.json()
    assert "access_token" in body
    assert "client_ip" in body  # present even if null in tests


def test_admin_login_and_me(client, make_user, auth):
    make_user("admin2@test.com", UserRole.ADMIN)
    headers = auth("admin2@test.com")
    r = client.get("/api/auth/me", headers=headers)
    assert r.status_code == 200
    assert r.json()["role"] == "ADMIN"


def test_faculty_registration_is_inactive(client):
    r = client.post(
        "/api/auth/register",
        json={"name": "P", "email": "pending@test.com", "password": "password123", "as_faculty": True},
    )
    assert r.status_code == 201
    assert r.json()["status"] == "INACTIVE"
    # inactive faculty cannot log in
    r = client.post("/api/auth/login", json={"email": "pending@test.com", "password": "password123"})
    assert r.status_code == 403


def test_student_cannot_create_quiz(client, make_user, auth):
    make_user("stud@test.com", UserRole.STUDENT)
    r = client.post("/api/quizzes", json={"title": "x"}, headers=auth("stud@test.com"))
    assert r.status_code == 403


# ---------- Ownership ----------
def test_faculty_cannot_edit_others_quiz(client, make_user, auth):
    make_user("f1@test.com", UserRole.FACULTY)
    make_user("f2@test.com", UserRole.FACULTY)
    quiz_id, _ = _make_quiz_with_questions(client, auth("f1@test.com"))
    r = client.put(f"/api/quizzes/{quiz_id}", json={"title": "hax"}, headers=auth("f2@test.com"))
    assert r.status_code == 403


# ---------- Publish guard ----------
def test_cannot_publish_empty_quiz(client, make_user, auth):
    make_user("f3@test.com", UserRole.FACULTY)
    fac = auth("f3@test.com")
    quiz_id = client.post(
        "/api/quizzes", json={"title": "Empty", "duration_minutes": 5}, headers=fac
    ).json()["id"]
    r = client.patch(f"/api/quizzes/{quiz_id}/publish", json={"status": "PUBLISHED"}, headers=fac)
    assert r.status_code == 400


# ---------- Attempt + scoring ----------
def test_full_attempt_scoring_and_review(client, make_user, auth):
    make_user("fac@test.com", UserRole.FACULTY)
    make_user("st@test.com", UserRole.STUDENT)
    fac, st = auth("fac@test.com"), auth("st@test.com")
    quiz_id, (q1, q2, q3) = _make_quiz_with_questions(client, fac, passing=60)

    start = client.post(f"/api/quizzes/{quiz_id}/start", headers=st).json()
    # correct answers are never exposed during the attempt
    assert all("is_correct" not in o for q in start["questions"] for o in q["options"])

    def correct(q):
        return next(o["id"] for o in q["options"] if o["is_correct"])

    def wrong(q):
        return next(o["id"] for o in q["options"] if not o["is_correct"])

    answers = [
        {"question_id": q1["id"], "selected_option_id": correct(q1)},  # 2 marks
        {"question_id": q2["id"], "selected_option_id": wrong(q2)},  # 0
        # q3 unanswered
    ]
    r = client.post(
        f"/api/quizzes/{quiz_id}/submit",
        json={"attempt_id": start["attempt_id"], "answers": answers},
        headers=st,
    )
    assert r.status_code == 200
    result = r.json()
    assert result["correct_answers"] == 1
    assert result["incorrect_answers"] == 1
    assert result["unanswered"] == 1
    assert result["score"] == 2
    assert result["percentage"] == 50.0
    assert result["status"] == "FAILED"
    # review reveals correct answers after submission
    assert all("correct_option_id" in rv for rv in result["review"])


def test_max_attempts_enforced(client, make_user, auth):
    make_user("fac2@test.com", UserRole.FACULTY)
    make_user("st2@test.com", UserRole.STUDENT)
    fac, st = auth("fac2@test.com"), auth("st2@test.com")
    quiz_id, _ = _make_quiz_with_questions(client, fac, max_attempts=1)
    start = client.post(f"/api/quizzes/{quiz_id}/start", headers=st).json()
    client.post(
        f"/api/quizzes/{quiz_id}/submit",
        json={"attempt_id": start["attempt_id"], "answers": []},
        headers=st,
    )
    r = client.post(f"/api/quizzes/{quiz_id}/start", headers=st)
    assert r.status_code == 403


# ---------- AI generation ----------
def test_ai_generate_and_approve(client, make_user, auth, fake_mistral):
    make_user("aifac@test.com", UserRole.FACULTY)
    fac = auth("aifac@test.com")
    quiz_id = client.post(
        "/api/quizzes", json={"title": "AI", "duration_minutes": 5}, headers=fac
    ).json()["id"]
    r = client.post(
        "/api/ai/generate",
        data={"mode": "TOPIC", "topics": "math", "class_level": "1", "num_questions": 1},
        headers=fac,
    )
    assert r.status_code == 201
    job = r.json()
    assert job["status"] == "COMPLETED"
    assert len(job["draft_questions"]) == 1

    r = client.post(
        f"/api/ai/jobs/{job['id']}/approve",
        json={"quiz_id": quiz_id, "questions": job["draft_questions"]},
        headers=fac,
    )
    assert r.status_code == 201
    qs = client.get(f"/api/quizzes/{quiz_id}/questions", headers=fac).json()
    assert len(qs) == 1
    assert qs[0]["source"] == "AI"


# ---------- Dashboards / analytics / leaderboard ----------
def test_admin_dashboard_and_analytics(client, make_user, auth):
    make_user("adm3@test.com", UserRole.ADMIN)
    headers = auth("adm3@test.com")
    assert client.get("/api/admin/dashboard", headers=headers).status_code == 200
    assert client.get("/api/admin/analytics", headers=headers).status_code == 200
    assert client.get("/api/admin/attempts", headers=headers).status_code == 200


def test_student_and_faculty_dashboards(client, make_user, auth):
    make_user("sd@test.com", UserRole.STUDENT)
    make_user("fd@test.com", UserRole.FACULTY)
    assert client.get("/api/dashboard/student", headers=auth("sd@test.com")).status_code == 200
    assert client.get("/api/dashboard/faculty", headers=auth("fd@test.com")).status_code == 200
    # cross-role access denied
    assert client.get("/api/dashboard/faculty", headers=auth("sd@test.com")).status_code == 403


def test_leaderboard_reflects_attempts(client, make_user, auth):
    make_user("lfac@test.com", UserRole.FACULTY)
    make_user("lst@test.com", UserRole.STUDENT)
    fac, st = auth("lfac@test.com"), auth("lst@test.com")
    quiz_id, (q1, q2, q3) = _make_quiz_with_questions(client, fac)
    start = client.post(f"/api/quizzes/{quiz_id}/start", headers=st).json()
    correct = [
        {"question_id": q["id"], "selected_option_id": next(o["id"] for o in q["options"] if o["is_correct"])}
        for q in (q1, q2, q3)
    ]
    client.post(
        f"/api/quizzes/{quiz_id}/submit",
        json={"attempt_id": start["attempt_id"], "answers": correct},
        headers=st,
    )
    board = client.get("/api/leaderboard", headers=fac).json()
    assert any(e["name"] == "lst" for e in board)


# ---------- Admin user management ----------
def test_admin_user_management(client, make_user, auth):
    make_user("adm4@test.com", UserRole.ADMIN)
    headers = auth("adm4@test.com")
    # create a faculty
    r = client.post(
        "/api/users",
        json={"name": "New Fac", "email": "newfac@test.com", "password": "password123", "role": "FACULTY", "status": "ACTIVE"},
        headers=headers,
    )
    assert r.status_code == 201
    uid = r.json()["id"]
    # list with role filter
    r = client.get("/api/users?role=FACULTY", headers=headers)
    assert any(u["id"] == uid for u in r.json())
    # deactivate
    r = client.patch(f"/api/users/{uid}/status?status=INACTIVE", headers=headers)
    assert r.json()["status"] == "INACTIVE"
    # delete
    assert client.delete(f"/api/users/{uid}", headers=headers).status_code == 204
