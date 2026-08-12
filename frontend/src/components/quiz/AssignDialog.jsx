import { useEffect, useState } from "react";
import { classroomsApi, quizzesApi } from "../../api";
import { Button, Modal, Spinner } from "../ui";
import { toast } from "../../lib/toast";

// Assign a quiz: open-to-all, or per-class whole-class / selected students.
export default function AssignDialog({ quizId, open, onClose, onSaved }) {
  const [loading, setLoading] = useState(true);
  const [visibility, setVisibility] = useState("OPEN");
  const [classes, setClasses] = useState([]);
  // per-class state: { [cid]: { included, whole, roster: [], studentIds: Set } }
  const [state, setState] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([classroomsApi.list(), quizzesApi.getAssignments(quizId)])
      .then(([cls, asg]) => {
        setClasses(cls);
        setVisibility(asg.visibility);
        const st = {};
        for (const a of asg.assignments) {
          st[a.classroom_id] = {
            included: true,
            whole: a.whole_class,
            roster: null,
            studentIds: new Set(a.student_ids),
          };
        }
        setState(st);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, quizId]);

  const ensureRoster = async (cid) => {
    if (state[cid]?.roster) return;
    try {
      const detail = await classroomsApi.get(cid);
      setState((s) => ({ ...s, [cid]: { ...s[cid], roster: detail.students || [] } }));
    } catch { /* toast via interceptor */ }
  };

  const toggleClass = (cid) =>
    setState((s) => {
      const cur = s[cid] || { included: false, whole: true, roster: null, studentIds: new Set() };
      return { ...s, [cid]: { ...cur, included: !cur.included } };
    });

  const setWhole = async (cid, whole) => {
    setState((s) => ({ ...s, [cid]: { ...s[cid], whole } }));
    if (!whole) ensureRoster(cid);
  };

  const toggleStudent = (cid, uid) =>
    setState((s) => {
      const ids = new Set(s[cid].studentIds);
      ids.has(uid) ? ids.delete(uid) : ids.add(uid);
      return { ...s, [cid]: { ...s[cid], studentIds: ids } };
    });

  const save = async () => {
    setSaving(true);
    try {
      let payload = { visibility, assignments: [] };
      if (visibility === "ASSIGNED") {
        payload.assignments = Object.entries(state)
          .filter(([, v]) => v.included)
          .map(([cid, v]) => ({
            classroom_id: Number(cid),
            whole_class: v.whole,
            student_ids: v.whole ? [] : [...v.studentIds],
          }));
        if (payload.assignments.length === 0) return toast("Pick at least one class or choose Open to all");
      }
      await quizzesApi.setAssignments(quizId, payload);
      toast("Assignment saved", "success");
      onSaved?.();
      onClose();
    } catch { /* interceptor toasts */ }
    finally { setSaving(false); }
  };

  return (
    <Modal
      open={open}
      title="Assign quiz"
      onClose={onClose}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={save} disabled={saving || loading}>{saving ? "Saving…" : "Save"}</Button>
      </>}
    >
      {loading ? <div className="grid place-items-center py-8"><Spinner size={24} /></div> : (
        <div className="space-y-3">
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="radio" checked={visibility === "OPEN"} onChange={() => setVisibility("OPEN")} /> Open to all</label>
            <label className="flex items-center gap-2"><input type="radio" checked={visibility === "ASSIGNED"} onChange={() => setVisibility("ASSIGNED")} /> Assign to classes</label>
          </div>

          {visibility === "ASSIGNED" && (
            classes.length === 0 ? <p className="text-sm text-ink/50">You have no classes yet.</p> : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {classes.map((c) => {
                  const cs = state[c.id] || {};
                  return (
                    <div key={c.id} className="border border-ink/15 rounded-sm p-3">
                      <label className="flex items-center gap-2 font-medium text-ink">
                        <input type="checkbox" checked={!!cs.included} onChange={() => toggleClass(c.id)} />
                        {c.name}{c.section ? ` · ${c.section}` : ""}
                      </label>
                      {cs.included && (
                        <div className="mt-2 pl-6 space-y-2">
                          <div className="flex gap-4 text-sm">
                            <label className="flex items-center gap-2"><input type="radio" checked={cs.whole !== false} onChange={() => setWhole(c.id, true)} /> Whole class</label>
                            <label className="flex items-center gap-2"><input type="radio" checked={cs.whole === false} onChange={() => setWhole(c.id, false)} /> Pick students</label>
                          </div>
                          {cs.whole === false && (
                            cs.roster === null ? <p className="text-xs text-ink/40">Loading roster…</p>
                              : cs.roster.length === 0 ? <p className="text-xs text-ink/40">No students enrolled.</p>
                              : <div className="space-y-1">
                                  {cs.roster.map((s) => (
                                    <label key={s.id} className="flex items-center gap-2 text-sm">
                                      <input type="checkbox" checked={cs.studentIds.has(s.id)} onChange={() => toggleStudent(c.id, s.id)} />
                                      {s.name} <span className="text-ink/40">· {s.email}</span>
                                    </label>
                                  ))}
                                </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      )}
    </Modal>
  );
}
