import { useEffect, useState } from "react";
import { usersApi } from "../../api";
import { Card, Table, Button, Badge, Modal, Input, Select, Spinner } from "../../components/ui";

const ROLES = ["STUDENT", "FACULTY", "ADMIN"];
const roleTone = { ADMIN: "red", FACULTY: "violet", STUDENT: "green" };

export default function Users() {
  const [rows, setRows] = useState(null);
  const [filters, setFilters] = useState({ role: "", status: "", search: "" });
  const [modal, setModal] = useState(null); // {mode:'create'|'edit', user}
  const [form, setForm] = useState({});
  const [error, setError] = useState("");

  const load = () => {
    const params = {};
    if (filters.role) params.role = filters.role;
    if (filters.status) params.status = filters.status;
    if (filters.search) params.search = filters.search;
    setRows(null);
    usersApi.list(params).then(setRows);
  };
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [filters.role, filters.status, filters.search]);

  const openCreate = () => { setForm({ name: "", email: "", password: "", role: "STUDENT", status: "ACTIVE" }); setError(""); setModal({ mode: "create" }); };
  const openEdit = (u) => { setForm({ name: u.name, password: "", role: u.role, status: u.status }); setError(""); setModal({ mode: "edit", user: u }); };

  const save = async () => {
    setError("");
    try {
      if (modal.mode === "create") {
        await usersApi.create({ name: form.name, email: form.email, password: form.password, role: form.role, status: form.status });
      } else {
        const payload = { name: form.name, role: form.role, status: form.status };
        if (form.password) payload.password = form.password;
        await usersApi.update(modal.user.id, payload);
      }
      setModal(null); load();
    } catch (e) { setError(e.response?.data?.detail || "Save failed."); }
  };

  const toggleStatus = async (u) => { await usersApi.setStatus(u.id, u.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"); load(); };
  const remove = async (u) => { if (confirm(`Delete ${u.name}?`)) { await usersApi.remove(u.id); load(); } };

  const columns = [
    { key: "name", header: "Name" },
    { key: "email", header: "Email" },
    { key: "role", header: "Role", render: (u) => <Badge tone={roleTone[u.role]}>{u.role}</Badge> },
    { key: "status", header: "Status", render: (u) => <Badge tone={u.status === "ACTIVE" ? "green" : "neutral"}>{u.status}</Badge> },
    { key: "quizzes_attempted", header: "Attempts" },
    { key: "actions", header: "", render: (u) => (
      <div className="flex flex-wrap gap-2 justify-end">
        <Button size="sm" variant="secondary" onClick={() => openEdit(u)}>Edit</Button>
        <Button size="sm" onClick={() => toggleStatus(u)}>{u.status === "ACTIVE" ? "Deactivate" : "Activate"}</Button>
        <Button size="sm" variant="danger" onClick={() => remove(u)}>Delete</Button>
      </div>
    ) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">Users</h1>
        <Button onClick={openCreate}>New user</Button>
      </div>
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input label="Search" placeholder="Name or email…" value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} />
          <Select label="Role" value={filters.role} onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value }))}>
            <option value="">All roles</option>{ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
          <Select label="Status" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
            <option value="">All statuses</option><option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option>
          </Select>
        </div>
      </Card>
      {rows === null ? <div className="grid place-items-center py-12"><Spinner size={28} /></div>
        : <Card><Table columns={columns} rows={rows} empty="No users match." /></Card>}

      <Modal open={modal != null} title={modal?.mode === "create" ? "New user" : "Edit user"} onClose={() => setModal(null)}
        footer={<><Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button><Button onClick={save}>Save</Button></>}>
        {modal && (
          <div className="space-y-3">
            <Input label="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            {modal.mode === "create" && <Input label="Email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />}
            <Input label={modal.mode === "create" ? "Password" : "New password (leave blank to keep)"} type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <Select label="Role" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>{ROLES.map((r) => <option key={r} value={r}>{r}</option>)}</Select>
              <Select label="Status" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}><option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option></Select>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}
