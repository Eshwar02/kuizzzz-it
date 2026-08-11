import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { quizzesApi } from "../../api";
import { Card, Stat, Badge, Button, Spinner } from "../../components/ui";

export default function QuizResults() {
  const { id } = useParams();
  const [quiz, setQuiz] = useState(null);
  useEffect(() => { quizzesApi.get(id).then(setQuiz); }, [id]);
  if (!quiz) return <div className="grid place-items-center py-12"><Spinner size={28} /></div>;
  return (
    <div className="space-y-4 max-w-2xl">
      <Link to="/faculty/quizzes" className="text-sm text-violet-dark">← Back to my quizzes</Link>
      <Card title={`Results · ${quiz.title}`} actions={<Badge tone="violet">{quiz.status}</Badge>}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Stat label="Questions" value={quiz.question_count} />
          <Stat label="Pass mark" value={`${quiz.passing_score}%`} />
          <Stat label="Duration" value={`${quiz.duration_minutes}m`} />
        </div>
        <p className="text-sm text-ink/60 mt-4">
          Aggregate attempt metrics across your quizzes are on your <Link to="/faculty" className="text-violet-dark">dashboard</Link>.
          Per-student attempt records are available to admins under Admin → Attempts.
        </p>
        <div className="mt-4"><Link to={`/faculty/quizzes/${id}/questions`}><Button variant="secondary">Manage questions</Button></Link></div>
      </Card>
    </div>
  );
}
