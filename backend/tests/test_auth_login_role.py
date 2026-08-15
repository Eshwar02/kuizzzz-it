"""Role-selective login: the login page sends the chosen role and the backend
enforces it, plus IP is surfaced only for privileged (admin/faculty) accounts.
"""

from app.models.enums import UserRole


def _login(client, email, password="password123", role=None):
    body = {"email": email, "password": password}
    if role is not None:
        body["role"] = role
    return client.post("/api/auth/login", json=body)


def test_correct_role_tab_logs_in(client, make_user):
    make_user("stud@example.com", UserRole.STUDENT)
    resp = _login(client, "stud@example.com", role="STUDENT")
    assert resp.status_code == 200, resp.text


def test_role_mismatch_is_rejected(client, make_user):
    make_user("stud2@example.com", UserRole.STUDENT)
    resp = _login(client, "stud2@example.com", role="ADMIN")
    assert resp.status_code == 403
    assert "admins only" in resp.json()["detail"].lower()


def test_login_without_role_still_works(client, make_user):
    """Back-compat: OAuth2 form flow and older clients send no role."""
    make_user("fac@example.com", UserRole.FACULTY)
    resp = _login(client, "fac@example.com")  # no role
    assert resp.status_code == 200, resp.text


def test_student_login_has_no_ip(client, make_user):
    make_user("stud3@example.com", UserRole.STUDENT)
    resp = _login(client, "stud3@example.com", role="STUDENT")
    assert resp.status_code == 200
    assert resp.json()["client_ip"] is None


def test_privileged_login_records_ip(client, make_user):
    make_user("admin2@example.com", UserRole.ADMIN)
    resp = _login(client, "admin2@example.com", role="ADMIN")
    assert resp.status_code == 200
    assert resp.json()["client_ip"] is not None


def test_bad_credentials_still_401(client, make_user):
    make_user("stud4@example.com", UserRole.STUDENT)
    resp = _login(client, "stud4@example.com", password="wrong", role="STUDENT")
    assert resp.status_code == 401
