import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, XCircle, ClipboardList, Trophy } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { dashboardApi } from "../../api";
import { Card, Stat, Table, Badge, Spinner, Gauge, Sparkline, SectionTitle } from "../../components/ui";
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

  const donut = [
    { name: "Passed", value: d.passed, tone: "#2F855A" },
    { name: "Failed", value: d.failed, tone: "#C53030" },
  ];
  const trend = [...(d.recent_attempts || [])].reverse().map((a) => a.percentage);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-ink">Dashboard</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Stat label="Attempted" value={d.total_attempted} icon={ClipboardList} />
        <Stat label="Passed" value={d.passed} icon={CheckCircle2} tone="#2F855A" />
        <Stat label="Failed" value={d.failed} icon={XCircle} tone="#C53030" />
        <Stat label="Avg score" value={fmtPct(d.average_score)} ring={d.average_score} />
        <Stat label="Highest" value={fmtPct(d.highest_score)} icon={Trophy} tone="#B7791F" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Pass / fail" className="lg:col-span-1">
          {d.passed + d.failed === 0 ? <p className="text-sm text-ink/50">No graded attempts yet.</p> : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donut} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={2}>
                    {donut.map((s) => <Cell key={s.name} fill={s.tone} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
        <Card title="Recent scores" className="lg:col-span-2">
          {trend.length < 2 ? <p className="text-sm text-ink/50">Take a few quizzes to see your trend.</p>
            : <div className="pt-6"><Sparkline data={trend} height={120} /></div>}
        </Card>
      </div>

      <section>
        <SectionTitle>Recent attempts</SectionTitle>
        <Card><Table columns={columns} rows={d.recent_attempts} empty="No attempts yet." /></Card>
      </section>
    </div>
  );
}
