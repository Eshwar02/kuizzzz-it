import { useEffect, useState } from "react";
import { classroomsApi } from "../../api";
import { Button, Card, Input, Modal, Spinner, EmptyState } from "../../components/ui";
import { toast } from "../../lib/toast";
import ClassCard from "../../components/classroom/ClassCard";

const PALETTE = ["#B23A6F", "#4A5568", "#2B6CB0", "#2F855A", "#B7791F", "#6B46C1"];

export default function MyClasses() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", section: "", subject: "", theme_color: PALETTE[0] });
  const [saving, setSaving] = useState(false);

  const load = () => classroomsApi.list().then(setClasses).catch(() => setClasses([])).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.name.trim()) return toast("Class name is required");
    setSaving(true);
    try {
      await classroomsApi.create({
        name: form.name.trim(),
        section: form.section || null,
        subject: form.subject || null,
        theme_color: form.theme_color,
      });
      setOpen(false);
      setForm({ name: "", section: "", subject: "", theme_color: PALETTE[0] });
      setLoading(true);
      load();
    } finally { setSaving(false); }
  };

  if (loading) return <div className="grid place-items-center py-12"><Spinner size={28} /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">My Classes</h1>
        <Button onClick={() => setOpen(true)}>Create class</Button>
      </div>

      {classes.length === 0 ? (
        <EmptyState title="No classes yet" message="Create a class and share its join code with students." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((c) => (
            <ClassCard key={c.id} classroom={c} to={`/classes/${c.id}`}>
              <div className="space-y-1">
                {c.subject && <div>{c.subject}</div>}
                <div>{c.student_count} student{c.student_count === 1 ? "" : "s"}</div>
                <div className="text-xs text-ink/50">Code: <span className="font-mono">{c.join_code}</span></div>
              </div>
            </ClassCard>
          ))}
        </div>
      )}

      <Modal
        open={open}
        title="Create class"
        onClose={() => setOpen(false)}
        footer={<>
          <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={create} disabled={saving}>{saving ? "Creating…" : "Create"}</Button>
        </>}
      >
        <div className="space-y-3">
          <Input label="Class name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Section" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} />
            <Input label="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          </div>
          <div>
            <span className="block text-sm font-medium text-ink/80 mb-1">Color</span>
            <div className="flex gap-2">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, theme_color: c })}
                  className={`h-8 w-8 rounded-sm border-2 ${form.theme_color === c ? "border-ink" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                  aria-label={`color ${c}`}
                />
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
