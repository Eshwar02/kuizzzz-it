import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { dashboardApi } from "../../api";
import { Card, Stat, Button, Spinner } from "../../components/ui";
import { fmtPct } from "../../lib/format";

export default function AdminDashboard() {
  const [d, setD] = useState(null);
  useEffect(() => { dashboardApi.adminOverview().then(setD); }, []);
  if (!d) return <div className="grid place-items-center py-12"><Spinner size={28} /></div>;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">Admin dashboard</h1>
        <Link to="/admin/analytics"><Button variant="secondary">View analytics</Button></Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Stat label="Students" value={d.total_students} />
        <Stat label="Faculty" value={d.total_faculty} />
        <Stat label="Quizzes" value={d.total_quizzes} sub={`${d.published_quizzes} published · ${d.draft_quizzes} draft`} />
        <Stat label="Questions" value={d.total_questions} />
        <Stat label="Attempts" value={d.total_attempts} />
        <Stat label="Avg score" value={fmtPct(d.average_score)} />
        <Stat label="Passed" value={d.passed_attempts} />
        <Stat label="Failed" value={d.failed_attempts} />
      </div>
    </div>
  );
}
