import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { quizzesApi, attemptsApi } from "../../api";
import { Card, Button, Badge, Stat, Spinner } from "../../components/ui";
import { fmtDate, scheduleState } from "../../lib/format";

export default function QuizDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    Promise.all([quizzesApi.get(id), attemptsApi.listMine()])
      .then(([q, all]) => { setQuiz(q); setAttempts(all.filter((a) => a.quiz_id === Number(id))); })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [id]);

  const start = async () => {
    setStarting(true);
    try {
      await attemptsApi.start(id); // creates/loads IN_PROGRESS attempt server-side
      navigate(`/attempt/${id}`);
    } finally { setStarting(false); }
  };

  if (loading) return <div className="grid place-items-center py-12"><Spinner size={28} /></div>;
  if (loadError || !quiz) return (
    <div className="max-w-3xl space-y-4">
      <Link to="/browse" className="text-sm text-violet-dark">← Back to browse</Link>
      <Card title="Quiz unavailable">This quiz could not be loaded. It may have been unpublished or removed.</Card>
    </div>
  );
  const used = attempts.length;
  const sched = scheduleState(quiz);
  const canAttempt = used < quiz.max_attempts && sched === "OPEN";

  return (
    <div className="space-y-4 max-w-3xl">
      <Link to="/browse" className="text-sm text-violet-dark">← Back to browse</Link>
      <Card title={quiz.title} actions={
        <span className="flex items-center gap-1.5">
          {sched === "UPCOMING" && <Badge tone="amber">Upcoming</Badge>}
          {sched === "CLOSED" && <Badge tone="red">Closed</Badge>}
          <Badge tone="violet">{quiz.difficulty}</Badge>
        </span>}>
        <p className="text-ink/70">{quiz.description || "No description."}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <Stat label="Duration" value={`${quiz.duration_minutes}m`} />
          <Stat label="Questions" value={quiz.question_count} />
          <Stat label="Pass mark" value={`${quiz.passing_score}%`} />
          <Stat label="Attempts" value={`${used}/${quiz.max_attempts}`} />
        </div>
        <div className="mt-6">
          <Button onClick={start} disabled={starting || !canAttempt || quiz.question_count === 0}>
            {starting ? "Starting…" : used > 0 ? "Attempt again" : "Start attempt"}
          </Button>
          {sched === "UPCOMING" && <p className="text-sm text-amber-700 mt-2">Opens {fmtDate(quiz.available_from)}.</p>}
          {sched === "CLOSED" && <p className="text-sm text-red-600 mt-2">This quiz closed {fmtDate(quiz.available_until)}.</p>}
          {sched === "OPEN" && used >= quiz.max_attempts && <p className="text-sm text-red-600 mt-2">You've used all attempts for this quiz.</p>}
          {quiz.question_count === 0 && <p className="text-sm text-ink/50 mt-2">This quiz has no questions yet.</p>}
        </div>
      </Card>
      {attempts.length > 0 && (
        <Card title="Your attempts">
          <ul className="divide-y divide-ink/10">
            {attempts.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2 text-sm">
                <span>{fmtDate(a.completed_at)}</span>
                <span className="flex items-center gap-3">
                  <Badge tone={a.status === "PASSED" ? "green" : "red"}>{a.status}</Badge>
                  <Link to={`/results/${a.id}`} className="text-violet-dark">Review</Link>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
