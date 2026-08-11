import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { dashboardApi } from "../../api";
import { Card, Stat, Button, Spinner } from "../../components/ui";
import { fmtPct } from "../../lib/format";

export default function FacultyDashboard() {
  const [d, setD] = useState(null);
  useEffect(() => { dashboardApi.faculty().then(setD); }, []);
  if (!d) return <div className="grid place-items-center py-12"><Spinner size={28} /></div>;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">Faculty dashboard</h1>
        <div className="flex gap-2">
          <Link to="/faculty/quizzes/new"><Button>New quiz</Button></Link>
          <Link to="/faculty/ai"><Button variant="secondary">AI generate</Button></Link>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Quizzes" value={d.total_quizzes} sub={`${d.published_quizzes} published · ${d.draft_quizzes} draft`} />
        <Stat label="Questions" value={d.total_questions} sub={`${d.ai_generated_questions} AI-generated`} />
        <Stat label="Attempts on my quizzes" value={d.total_attempts_on_my_quizzes} />
        <Stat label="Avg score" value={fmtPct(d.average_score_on_my_quizzes)} />
      </div>
    </div>
  );
}
