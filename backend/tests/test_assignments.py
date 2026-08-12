from app.models.enums import QuizStatus, QuizVisibility, UserRole
from app.services import assignments as asvc


def _hdr(client, email, pw="password123"):
    return {
        "Authorization": f"Bearer {client.post('/api/auth/login', json={'email': email, 'password': pw}).json()['access_token']}"
    }


def _mk(db, make_user):
    from app.models.assignment import QuizAssignment, QuizAssignmentStudent
    from app.models.classroom import Classroom, ClassroomStudent
    from app.models.quiz import Quiz

    fac = make_user("svcf@t.com", UserRole.FACULTY)
    s_in = make_user("in@t.com", UserRole.STUDENT)
    s_out = make_user("out@t.com", UserRole.STUDENT)
    c = Classroom(name="C", theme_color="#111111", join_code="SVC001", owner_id=fac.id)
    db.add(c)
    db.flush()
    db.add(ClassroomStudent(classroom_id=c.id, user_id=s_in.id))
    db.add(ClassroomStudent(classroom_id=c.id, user_id=s_out.id))
    q = Quiz(title="Q", created_by=fac.id, status=QuizStatus.PUBLISHED, visibility=QuizVisibility.ASSIGNED)
    db.add(q)
    db.flush()
    a = QuizAssignment(quiz_id=q.id, classroom_id=c.id, whole_class=False)
    db.add(a)
    db.flush()
    db.add(QuizAssignmentStudent(assignment_id=a.id, user_id=s_in.id))
    db.flush()
    return q, s_in, s_out


def test_selected_student_access(db, make_user):
    q, s_in, s_out = _mk(db, make_user)
    assert asvc.student_can_access(db, s_in, q) is True
    assert asvc.student_can_access(db, s_out, q) is False


def _class_with_student(client, fac, student_email):
    code = client.post("/api/classrooms", json={"name": "Room"}, headers=fac).json()["join_code"]
    st = _hdr(client, student_email)
    cid = client.post("/api/classrooms/join", json={"code": code}, headers=st).json()["id"]
    sid = client.get("/api/auth/me", headers=st).json()["id"]
    return cid, sid, st


def _quiz(client, fac):
    qid = client.post("/api/quizzes", json={"title": "AQ", "duration_minutes": 5}, headers=fac).json()["id"]
    client.post(
        f"/api/quizzes/{qid}/questions",
        json={"question_text": "q", "options": [{"option_text": "a", "is_correct": True}, {"option_text": "b", "is_correct": False}]},
        headers=fac,
    )
    client.patch(f"/api/quizzes/{qid}/publish", json={"status": "PUBLISHED"}, headers=fac)
    return qid


def test_put_and_get_assignments(client, make_user):
    make_user("aqf@t.com", UserRole.FACULTY)
    make_user("aqs@t.com", UserRole.STUDENT)
    fac = _hdr(client, "aqf@t.com")
    cid, sid, _ = _class_with_student(client, fac, "aqs@t.com")
    qid = _quiz(client, fac)
    r = client.put(
        f"/api/quizzes/{qid}/assignments",
        json={"visibility": "ASSIGNED", "assignments": [{"classroom_id": cid, "whole_class": False, "student_ids": [sid]}]},
        headers=fac,
    )
    assert r.status_code == 200
    got = client.get(f"/api/quizzes/{qid}/assignments", headers=fac).json()
    assert got["visibility"] == "ASSIGNED"
    assert got["assignments"][0]["student_ids"] == [sid]


def test_put_rejects_foreign_class(client, make_user):
    make_user("of1@t.com", UserRole.FACULTY)
    make_user("of2@t.com", UserRole.FACULTY)
    f1, f2 = _hdr(client, "of1@t.com"), _hdr(client, "of2@t.com")
    cid = client.post("/api/classrooms", json={"name": "Theirs"}, headers=f2).json()["id"]
    qid = _quiz(client, f1)
    r = client.put(
        f"/api/quizzes/{qid}/assignments",
        json={"visibility": "ASSIGNED", "assignments": [{"classroom_id": cid, "whole_class": True}]},
        headers=f1,
    )
    assert r.status_code == 400


def test_non_targeted_student_blocked(client, make_user):
    make_user("bf@t.com", UserRole.FACULTY)
    make_user("bin@t.com", UserRole.STUDENT)
    make_user("bout@t.com", UserRole.STUDENT)
    fac = _hdr(client, "bf@t.com")
    code = client.post("/api/classrooms", json={"name": "R"}, headers=fac).json()["join_code"]
    in_h, out_h = _hdr(client, "bin@t.com"), _hdr(client, "bout@t.com")
    cid = client.post("/api/classrooms/join", json={"code": code}, headers=in_h).json()["id"]
    client.post("/api/classrooms/join", json={"code": code}, headers=out_h)
    in_id = client.get("/api/auth/me", headers=in_h).json()["id"]
    qid = _quiz(client, fac)
    client.put(
        f"/api/quizzes/{qid}/assignments",
        json={"visibility": "ASSIGNED", "assignments": [{"classroom_id": cid, "whole_class": False, "student_ids": [in_id]}]},
        headers=fac,
    )
    assert any(q["id"] == qid for q in client.get("/api/quizzes", headers=in_h).json())
    assert all(q["id"] != qid for q in client.get("/api/quizzes", headers=out_h).json())
    assert client.post(f"/api/quizzes/{qid}/start", headers=out_h).status_code == 403
    assert client.post(f"/api/quizzes/{qid}/start", headers=in_h).status_code == 200


def test_todo_lists_pending_and_drops_completed(client, make_user):
    make_user("tf@t.com", UserRole.FACULTY)
    make_user("ts@t.com", UserRole.STUDENT)
    fac = _hdr(client, "tf@t.com")
    code = client.post("/api/classrooms", json={"name": "TR"}, headers=fac).json()["join_code"]
    st = _hdr(client, "ts@t.com")
    cid = client.post("/api/classrooms/join", json={"code": code}, headers=st).json()["id"]
    qid = _quiz(client, fac)
    client.put(
        f"/api/quizzes/{qid}/assignments",
        json={"visibility": "ASSIGNED", "assignments": [{"classroom_id": cid, "whole_class": True}]},
        headers=fac,
    )
    todo = client.get("/api/assignments/todo", headers=st).json()
    assert any(t["quiz_id"] == qid for t in todo)
    start = client.post(f"/api/quizzes/{qid}/start", headers=st).json()
    client.post(f"/api/quizzes/{qid}/submit", json={"attempt_id": start["attempt_id"], "answers": []}, headers=st)
    todo2 = client.get("/api/assignments/todo", headers=st).json()
    assert all(t["quiz_id"] != qid for t in todo2)
