import { useEffect, useRef, useState } from "react";
import { dashboardApi } from "../../api";
import { Card, Table, Badge, Modal, Spinner, Button, Stat } from "../../components/ui";
import { fmtDate, fmtDuration } from "../../lib/format";

export default function AllAttempts() {
  const [rows, setRows] = useState(null);
  const [detail, setDetail] = useState(null);
  const reqSeq = useRef(0);
  useEffect(() => { dashboardApi.adminAttempts().then(setRows); }, []);

  // Sequence guard: if the user opens another row before the first fetch
  // resolves, only the latest request is allowed to set the detail.
  const open = async (r) => {
    const seq = ++reqSeq.current;
    setDetail("loading");
    const result = await dashboardApi.adminAttempt(r.id);
    if (reqSeq.current === seq) setDetail(result);
  };

  if (!rows) return <div className="grid place-items-center py-12"><Spinner size={28} /></div>;
  const columns = [
    { key: "quiz_title", header: "Quiz", render: (r) => r.quiz_title || `Quiz #${r.quiz_id}` },
    { key: "percentage", header: "Score", render: (r) => `${r.percentage.toFixed(1)}%` },
    { key: "status", header: "Status", render: (r) => <Badge tone={r.status === "PASSED" ? "green" : "red"}>{r.status}</Badge> },
    { key: "completed_at", header: "Completed", render: (r) => fmtDate(r.completed_at) },
    { key: "actions", header: "", render: (r) => <Button size="sm" variant="secondary" onClick={() => open(r)}>View</Button> },
  ];
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-ink">All attempts</h1>
      <Card><Table columns={columns} rows={rows} empty="No completed attempts yet." /></Card>
      <Modal open={detail != null} title="Attempt detail" onClose={() => setDetail(null)}>
        {detail === "loading" || detail == null ? <div className="grid place-items-center py-6"><Spinner /></div> : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Quiz" value={detail.quiz_title} />
              <Stat label="Score" value={`${detail.score}/${detail.total_marks}`} sub={`${detail.percentage.toFixed(1)}%`} />
              <Stat label="Correct" value={`${detail.correct_answers}/${detail.total_questions}`} />
              <Stat label="Time" value={fmtDuration(detail.time_taken)} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
