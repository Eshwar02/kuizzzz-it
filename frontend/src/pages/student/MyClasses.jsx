import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { classroomsApi } from "../../api";
import { Button, Input, Modal, Spinner, EmptyState } from "../../components/ui";
import { toast } from "../../lib/toast";
import ClassCard from "../../components/classroom/ClassCard";

export default function MyClasses() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);

  const load = () => classroomsApi.list().then(setClasses).catch(() => setClasses([])).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const join = async () => {
    if (!code.trim()) return toast("Enter a class code");
    setJoining(true);
    try {
      const c = await classroomsApi.join(code.trim());
      setOpen(false);
      setCode("");
      navigate(`/classes/${c.id}`);
    } catch { /* interceptor toasts (404 bad code / 409 already in) */ }
    finally { setJoining(false); }
  };

  if (loading) return <div className="grid place-items-center py-12"><Spinner size={28} /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">My Classes</h1>
        <Button onClick={() => setOpen(true)}>Join class</Button>
      </div>

      {classes.length === 0 ? (
        <EmptyState title="No classes yet" message="Ask your teacher for a class code, then click “Join class”." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((c) => (
            <ClassCard key={c.id} classroom={c} to={`/classes/${c.id}`}>
              <div className="space-y-1">
                {c.owner_name && <div>{c.owner_name}</div>}
                {c.subject && <div className="text-xs text-ink/50">{c.subject}</div>}
                <div className="text-xs text-ink/50">{c.student_count} classmate{c.student_count === 1 ? "" : "s"}</div>
              </div>
            </ClassCard>
          ))}
        </div>
      )}

      <Modal
        open={open}
        title="Join a class"
        onClose={() => setOpen(false)}
        footer={<>
          <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={join} disabled={joining}>{joining ? "Joining…" : "Join"}</Button>
        </>}
      >
        <Input label="Class code" placeholder="e.g. 4KP2Q9" value={code} onChange={(e) => setCode(e.target.value)} />
      </Modal>
    </div>
  );
}
