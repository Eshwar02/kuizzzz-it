from app.models.enums import UserRole
from app.services import authz


def _auth_hdr(client, email, pw="password123"):
    r = client.post("/api/auth/login", json={"email": email, "password": pw})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_authz_helpers_recognize_owner(db, make_user):
    from app.models.classroom import Classroom, ClassroomTeacher

    fac = make_user("owner@t.com", UserRole.FACULTY)
    other = make_user("nope@t.com", UserRole.FACULTY)
    db.add(Classroom(id=1, name="C", theme_color="#111111", join_code="ABC123", owner_id=fac.id))
    db.add(ClassroomTeacher(classroom_id=1, user_id=fac.id))
    db.flush()
    c = db.get(Classroom, 1)
    assert authz.is_class_teacher(db, fac, c) is True
    assert authz.is_class_teacher(db, other, c) is False


def test_faculty_creates_class_and_lists(client, make_user):
    make_user("cf@t.com", UserRole.FACULTY)
    fac = _auth_hdr(client, "cf@t.com")
    r = client.post("/api/classrooms", json={"name": "Maths", "section": "A"}, headers=fac)
    assert r.status_code == 201
    body = r.json()
    assert body["join_code"] and body["owner_id"]
    assert body["teacher_count"] == 1
    mine = client.get("/api/classrooms", headers=fac).json()
    assert any(c["id"] == body["id"] for c in mine)


def test_student_cannot_create_class(client, make_user):
    make_user("cs@t.com", UserRole.STUDENT)
    r = client.post("/api/classrooms", json={"name": "X"}, headers=_auth_hdr(client, "cs@t.com"))
    assert r.status_code == 403


def test_student_join_leave_and_bad_code(client, make_user):
    make_user("jf@t.com", UserRole.FACULTY)
    make_user("js@t.com", UserRole.STUDENT)
    fac, st = _auth_hdr(client, "jf@t.com"), _auth_hdr(client, "js@t.com")
    code = client.post("/api/classrooms", json={"name": "Bio"}, headers=fac).json()["join_code"]
    cid = client.post("/api/classrooms/join", json={"code": code}, headers=st).json()["id"]
    assert client.post("/api/classrooms/join", json={"code": code}, headers=st).status_code == 409
    assert client.post("/api/classrooms/join", json={"code": "ZZZZZZ"}, headers=st).status_code == 404
    view = client.get(f"/api/classrooms/{cid}", headers=st).json()
    assert view["join_code"] is None and view["students"] == []
    assert client.delete(f"/api/classrooms/{cid}/leave", headers=st).status_code == 204


def test_teacher_removes_student(client, make_user):
    make_user("rf@t.com", UserRole.FACULTY)
    make_user("rs@t.com", UserRole.STUDENT)
    fac, st = _auth_hdr(client, "rf@t.com"), _auth_hdr(client, "rs@t.com")
    code = client.post("/api/classrooms", json={"name": "Chem"}, headers=fac).json()["join_code"]
    cid = client.post("/api/classrooms/join", json={"code": code}, headers=st).json()["id"]
    sid = client.get("/api/auth/me", headers=st).json()["id"]
    assert client.delete(f"/api/classrooms/{cid}/students/{sid}", headers=fac).status_code == 204


def test_coteacher_add_remove_and_owner_guard(client, make_user):
    make_user("of@t.com", UserRole.FACULTY)
    make_user("co@t.com", UserRole.FACULTY)
    make_user("stu@t.com", UserRole.STUDENT)
    owner = _auth_hdr(client, "of@t.com")
    cid = client.post("/api/classrooms", json={"name": "Phys"}, headers=owner).json()["id"]
    co_id = client.get("/api/auth/me", headers=_auth_hdr(client, "co@t.com")).json()["id"]
    stu_id = client.get("/api/auth/me", headers=_auth_hdr(client, "stu@t.com")).json()["id"]
    assert client.post(f"/api/classrooms/{cid}/teachers", json={"user_id": co_id}, headers=owner).status_code == 200
    assert client.post(f"/api/classrooms/{cid}/teachers", json={"user_id": stu_id}, headers=owner).status_code == 400
    owner_id = client.get("/api/auth/me", headers=owner).json()["id"]
    assert client.delete(f"/api/classrooms/{cid}/teachers/{owner_id}", headers=owner).status_code == 400
    assert client.delete(f"/api/classrooms/{cid}/teachers/{co_id}", headers=owner).status_code == 204


def test_admin_lists_all_classrooms(client, make_user):
    make_user("af@t.com", UserRole.FACULTY)
    make_user("aad@t.com", UserRole.ADMIN)
    fac, adm = _auth_hdr(client, "af@t.com"), _auth_hdr(client, "aad@t.com")
    client.post("/api/classrooms", json={"name": "Hist"}, headers=fac)
    rows = client.get("/api/admin/classrooms", headers=adm).json()
    assert any(c["name"] == "Hist" and c["owner_name"] for c in rows)
