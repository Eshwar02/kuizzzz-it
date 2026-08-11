import { useEffect, useState } from "react";
import { categoriesApi } from "../../api";
import { Card, Table, Button, Modal, Input, Textarea, Spinner } from "../../components/ui";
import { fmtDay } from "../../lib/format";

export default function Categories() {
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(null); // {mode, cat}
  const [form, setForm] = useState({ name: "", description: "" });
  const [error, setError] = useState("");
  const load = () => { setRows(null); categoriesApi.list().then(setRows); };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm({ name: "", description: "" }); setError(""); setModal({ mode: "create" }); };
  const openEdit = (c) => { setForm({ name: c.name, description: c.description || "" }); setError(""); setModal({ mode: "edit", cat: c }); };
  const save = async () => {
    setError("");
    try {
      const payload = { name: form.name, description: form.description || null };
      if (modal.mode === "create") await categoriesApi.create(payload);
      else await categoriesApi.update(modal.cat.id, payload);
      setModal(null); load();
    } catch (e) { setError(e.response?.data?.detail || "Save failed."); }
  };
  const remove = async (c) => { if (confirm(`Delete category "${c.name}"?`)) { await categoriesApi.remove(c.id); load(); } };

  if (rows === null) return <div className="grid place-items-center py-12"><Spinner size={28} /></div>;
  const columns = [
    { key: "name", header: "Name" },
    { key: "description", header: "Description", render: (c) => c.description || "—" },
    { key: "created_at", header: "Created", render: (c) => fmtDay(c.created_at) },
    { key: "actions", header: "", render: (c) => (
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="secondary" onClick={() => openEdit(c)}>Edit</Button>
        <Button size="sm" variant="danger" onClick={() => remove(c)}>Delete</Button>
      </div>
    ) },
  ];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">Categories</h1>
        <Button onClick={openCreate}>New category</Button>
      </div>
      <Card><Table columns={columns} rows={rows} empty="No categories yet." /></Card>
      <Modal open={modal != null} title={modal?.mode === "create" ? "New category" : "Edit category"} onClose={() => setModal(null)}
        footer={<><Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button><Button onClick={save}>Save</Button></>}>
        {modal && (
          <div className="space-y-3">
            <Input label="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <Textarea label="Description" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}
