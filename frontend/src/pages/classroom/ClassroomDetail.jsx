import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { classroomsApi, usersApi } from "../../api";
import { Users, GraduationCap } from "lucide-react";
import { Card, Button, Spinner, Modal, Select, Badge, Stat } from "../../components/ui";
import { toast } from "../../lib/toast";
import { useAuth } from "../../auth/AuthContext";

export default function ClassroomDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [c, setC] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [faculty, setFaculty] = useState([]);
  const [addOpen, setAddOpen] = useState(false);
  const [pick, setPick] = useState("");

  const load = () => classroomsApi.get(id).then((d) => { setC(d); setLoadError(false); }).catch(() => setLoadError(true));
  useEffect(() => { load(); }, [id]);

  // teacher view when the backend returns the join_code (hidden from students)
  const isTeacher = c && c.join_code != null;
  const isOwner = c && (c.owner_id === user?.id || user?.role === "ADMIN");

  const openAdd = async () => {
    if (!faculty.length) {
      try { setFaculty(await usersApi.list({ role: "FACULTY" })); } catch { /* toast handled by interceptor */ }
    }
    setAddOpen(true);
  };

  const addTeacher = async () => {
    if (!pick) return;
    try { await classroomsApi.addTeacher(id, Number(pick)); setAddOpen(false); setPick(""); load(); }
    catch { /* interceptor toasts */ }
  };

  const act = (fn) => async () => { try { await fn(); load(); } catch { /* interceptor toasts */ } };

  const leave = async () => {
    try { await classroomsApi.leave(id); navigate("/classes"); } catch { /* toast */ }
  };
  const del = async () => {
    if (!confirm("Delete this class? This cannot be undone.")) return;
    try { await classroomsApi.remove(id); toast("Class deleted", "success"); navigate(-1); } catch { /* toast */ }
  };

  if (loadError) return (
    <div className="max-w-3xl space-y-4">
      <Link to="/" className="text-sm text-violet-dark">← Back</Link>
      <Card title="Class unavailable">You don't have access to this class, or it no longer exists.</Card>
    </div>
  );
  if (!c) return <div className="grid place-items-center py-12"><Spinner size={28} /></div>;

  return (
    <div className="space-y-4 max-w-3xl">
      <button onClick={() => navigate(-1)} className="text-sm text-violet-dark">← Back</button>

      <div className="rounded-sm p-6 text-white" style={{ backgroundColor: c.theme_color }}>
        <h1 className="text-2xl font-semibold">{c.name}</h1>
        {c.section && <p className="opacity-90">{c.section}</p>}
        {c.subject && <p className="opacity-75 text-sm">{c.subject}</p>}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Stat label="Teachers" value={c.teacher_count} icon={GraduationCap} tone="#2B6CB0" />
        <Stat label="Students" value={c.student_count} icon={Users} />
      </div>

      {isTeacher ? (
        <>
          <Card title="Join code" actions={isOwner && <Button variant="secondary" size="sm" onClick={act(() => classroomsApi.regenerateCode(id))}>Regenerate</Button>}>
            <p className="font-mono text-xl tracking-widest text-ink">{c.join_code}</p>
            <p className="text-sm text-ink/50 mt-1">Share this code with students so they can join.</p>
          </Card>

          <Card title={`Teachers (${c.teachers.length})`} actions={isOwner && <Button size="sm" onClick={openAdd}>Add co-teacher</Button>}>
            <ul className="divide-y divide-ink/10">
              {c.teachers.map((t) => (
                <li key={t.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{t.name} <span className="text-ink/40">· {t.email}</span></span>
                  <span className="flex items-center gap-2">
                    {t.id === c.owner_id ? <Badge tone="violet">Owner</Badge>
                      : isOwner && <Button variant="ghost" size="sm" onClick={act(() => classroomsApi.removeTeacher(id, t.id))}>Remove</Button>}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card title={`Students (${c.students.length})`}>
            {c.students.length === 0 ? <p className="text-sm text-ink/50">No students yet.</p> : (
              <ul className="divide-y divide-ink/10">
                {c.students.map((s) => (
                  <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                    <span>{s.name} <span className="text-ink/40">· {s.email}</span></span>
                    <Button variant="ghost" size="sm" onClick={act(() => classroomsApi.removeStudent(id, s.id))}>Remove</Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {isOwner && <Button variant="secondary" onClick={del}>Delete class</Button>}
        </>
      ) : (
        <>
          <Card title={`Teachers`}>
            <ul className="divide-y divide-ink/10">
              {c.teachers.map((t) => (
                <li key={t.id} className="py-2 text-sm">{t.name}</li>
              ))}
            </ul>
          </Card>
          <Card title="Classmates">
            <p className="text-sm text-ink/70">{c.student_count} student{c.student_count === 1 ? "" : "s"} enrolled.</p>
          </Card>
          <Button variant="secondary" onClick={leave}>Leave class</Button>
        </>
      )}

      <Modal
        open={addOpen}
        title="Add co-teacher"
        onClose={() => setAddOpen(false)}
        footer={<>
          <Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button onClick={addTeacher} disabled={!pick}>Add</Button>
        </>}
      >
        <Select label="Faculty" value={pick} onChange={(e) => setPick(e.target.value)}>
          <option value="">Select a faculty…</option>
          {faculty.filter((f) => !c.teachers.some((t) => t.id === f.id)).map((f) => (
            <option key={f.id} value={f.id}>{f.name} — {f.email}</option>
          ))}
        </Select>
      </Modal>
    </div>
  );
}
