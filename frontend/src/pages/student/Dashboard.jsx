import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { dashboardApi } from "../../api";
import { Card, Stat, Table, Badge, Spinner } from "../../components/ui";
import { fmtDate, fmtPct } from "../../lib/format";

export default function StudentDashboard() {
  const [d, setD] = useState(null);
  useEffect(() => { dashboardApi.student().then(setD); }, []);
  if (!d) return <div className="grid place-items-center py-12"><Spinner size={28} /></div>;

  const columns = [
    { key: "quiz_title", header: "Quiz" },
    { key: "percentage", header: "Score", render: (r) => fmtPct(r.percentage) },
    { key: "status", header: "Status", render: (r) => <Badge tone={r.status === "PASSED" ? "green" : r.status === "FAILED" ? "red" : "amber"}>{r.status}</Badge> },
    { key: "completed_at", header: "When", render: (r) => fmtDate(r.completed_at) },
    { key: "actions", header: "", render: (r) => <Link to={`/results/${r.attempt_id}`} className="text-violet-dark">Review</Link> },
  ];
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-ink">Dashboard</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Stat label="Attempted" value={d.total_attempted} />
        <Stat label="Passed" value={d.passed} />
        <Stat label="Failed" value={d.failed} />
        <Stat label="Avg score" value={fmtPct(d.average_score)} />
        <Stat label="Highest" value={fmtPct(d.highest_score)} />
      </div>
      <Card title="Recent attempts"><Table columns={columns} rows={d.recent_attempts} empty="No attempts yet." /></Card>
    </div>
  );
}
