import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { classroomsApi, usersApi } from "../../api";
import { Card, Table, Button, Modal, Select, Spinner } from "../../components/ui";
import { toast } from "../../lib/toast";

export default function Classrooms() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [faculty, setFaculty] = useState([]);
  const [reassign, setReassign] = useState(null); // classroom row
  const [pick, setPick] = useState("");

  const load = () => classroomsApi.adminList().then(setRows).catch(() => setRows([])).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const del = async (id) => {
    if (!confirm("Delete this class?")) return;
    try { await classroomsApi.remove(id); toast("Class deleted", "success"); setLoading(true); load(); } catch { /* toast */ }
  };

  const openReassign = async (row) => {
    if (!faculty.length) { try { setFaculty(await usersApi.list({ role: "FACULTY" })); } catch { /* toast */ } }
    setPick("");
    setReassign(row);
  };
  const doReassign = async () => {
    if (!pick) return;
    try { await classroomsApi.reassignOwner(reassign.id, Number(pick)); setReassign(null); setLoading(true); load(); } catch { /* toast */ }
  };

  if (loading) return <div className="grid place-items-center py-12"><Spinner size={28} /></div>;

  const columns = [
    { key: "name", header: "Class", render: (r) => <Link to={`/classes/${r.id}`} className="text-violet-dark">{r.name}</Link> },
    { key: "owner_name", header: "Owner" },
    { key: "teacher_count", header: "Teachers" },
    { key: "student_count", header: "Students" },
    { key: "actions", header: "", render: (r) => (
      <span className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={() => openReassign(r)}>Reassign</Button>
        <Button variant="ghost" size="sm" onClick={() => del(r.id)}>Delete</Button>
      </span>
    ) },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-ink">Classrooms</h1>
      <Card>
        <Table columns={columns} rows={rows} empty="No classrooms yet." />
      </Card>

      <Modal
        open={!!reassign}
        title={`Reassign owner — ${reassign?.name || ""}`}
        onClose={() => setReassign(null)}
        footer={<>
          <Button variant="secondary" onClick={() => setReassign(null)}>Cancel</Button>
          <Button onClick={doReassign} disabled={!pick}>Reassign</Button>
        </>}
      >
        <Select label="New owner (faculty)" value={pick} onChange={(e) => setPick(e.target.value)}>
          <option value="">Select a faculty…</option>
          {faculty.map((f) => <option key={f.id} value={f.id}>{f.name} — {f.email}</option>)}
        </Select>
      </Modal>
    </div>
  );
}
