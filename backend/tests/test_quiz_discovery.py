"""Quiz discovery: search, difficulty/duration filters, popularity/recent sort."""

from app.models.enums import UserRole


def _mk(client, fac, *, title, difficulty="INTERMEDIATE", duration=20):
    quiz_id = client.post(
        "/api/quizzes",
        json={
            "title": title,
            "difficulty": difficulty,
            "duration_minutes": duration,
            "passing_score": 50,
        },
        headers=fac,
    ).json()["id"]
    opts = [{"option_text": f"o{i}", "is_correct": i == 0} for i in range(2)]
    client.post(
        f"/api/quizzes/{quiz_id}/questions",
        json={"question_text": "q", "marks": 1, "difficulty": "EASY", "options": opts},
        headers=fac,
    )
    client.patch(
        f"/api/quizzes/{quiz_id}/publish", json={"status": "PUBLISHED"}, headers=fac
    )
    return quiz_id


def _take(client, st, quiz_id):
    start = client.post(f"/api/quizzes/{quiz_id}/start", headers=st).json()
    q = start["questions"][0]
    client.post(
        f"/api/quizzes/{quiz_id}/submit",
        json={
            "attempt_id": start["attempt_id"],
            "answers": [{"question_id": q["id"], "selected_option_id": q["options"][0]["id"]}],
        },
        headers=st,
    )


def _setup(client, make_user, auth):
    make_user("dfac@test.com", UserRole.FACULTY)
    fac = auth("dfac@test.com")
    easy = _mk(client, fac, title="Easy Short", difficulty="EASY", duration=10)
    hard = _mk(client, fac, title="Hard Long", difficulty="HARD", duration=60)
    return fac, easy, hard


def test_difficulty_filter(client, make_user, auth):
    fac, easy, hard = _setup(client, make_user, auth)
    make_user("dst@test.com", UserRole.STUDENT)
    st = auth("dst@test.com")
    rows = client.get("/api/quizzes", params={"difficulty": "EASY"}, headers=st).json()
    ids = [r["id"] for r in rows]
    assert easy in ids and hard not in ids


def test_max_duration_filter(client, make_user, auth):
    fac, easy, hard = _setup(client, make_user, auth)
    make_user("dst2@test.com", UserRole.STUDENT)
    st = auth("dst2@test.com")
    rows = client.get("/api/quizzes", params={"max_duration": 15}, headers=st).json()
    ids = [r["id"] for r in rows]
    assert easy in ids and hard not in ids


def test_popularity_sort_and_count(client, make_user, auth):
    fac, easy, hard = _setup(client, make_user, auth)
    make_user("dst3@test.com", UserRole.STUDENT)
    st = auth("dst3@test.com")
    _take(client, st, hard)  # hard gets one attempt
    rows = client.get("/api/quizzes", params={"sort": "popular"}, headers=st).json()
    # Most-attempted first.
    assert rows[0]["id"] == hard
    assert rows[0]["attempt_count"] == 1


def test_search_by_category_name(client, make_user, auth):
    make_user("dfac2@test.com", UserRole.FACULTY)
    fac = auth("dfac2@test.com")
    cats = client.get("/api/categories", headers=fac).json()
    assert cats, "seeded categories expected"
    cat = cats[0]
    quiz_id = client.post(
        "/api/quizzes",
        json={"title": "Zebra", "category_id": cat["id"], "duration_minutes": 5},
        headers=fac,
    ).json()["id"]
    opts = [{"option_text": f"o{i}", "is_correct": i == 0} for i in range(2)]
    client.post(
        f"/api/quizzes/{quiz_id}/questions",
        json={"question_text": "q", "marks": 1, "difficulty": "EASY", "options": opts},
        headers=fac,
    )
    client.patch(
        f"/api/quizzes/{quiz_id}/publish", json={"status": "PUBLISHED"}, headers=fac
    )
    make_user("dst4@test.com", UserRole.STUDENT)
    st = auth("dst4@test.com")
    rows = client.get("/api/quizzes", params={"search": cat["name"]}, headers=st).json()
    assert quiz_id in [r["id"] for r in rows]
