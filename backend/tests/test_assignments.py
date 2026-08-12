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
