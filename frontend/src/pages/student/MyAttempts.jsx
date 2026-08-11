import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { attemptsApi } from "../../api";
import { Card, Table, Badge, Spinner } from "../../components/ui";
import { fmtDate } from "../../lib/format";

export default function MyAttempts() {
  const [rows, setRows] = useState(null);
  useEffect(() => { attemptsApi.listMine().then(setRows); }, []);
  if (!rows) return <div className="grid place-items-center py-12"><Spinner size={28} /></div>;

  const columns = [
    { key: "quiz_title", header: "Quiz", render: (r) => r.quiz_title || `Quiz #${r.quiz_id}` },
    { key: "percentage", header: "Score", render: (r) => `${r.percentage.toFixed(1)}%` },
    { key: "status", header: "Status", render: (r) => <Badge tone={r.status === "PASSED" ? "green" : r.status === "FAILED" ? "red" : "amber"}>{r.status}</Badge> },
    { key: "completed_at", header: "Completed", render: (r) => fmtDate(r.completed_at) },
    { key: "actions", header: "", render: (r) => <Link to={`/results/${r.id}`} className="text-violet-dark">Review</Link> },
  ];
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-ink">My attempts</h1>
      <Card><Table columns={columns} rows={rows} empty="You haven't attempted any quizzes yet." /></Card>
    </div>
  );
}
