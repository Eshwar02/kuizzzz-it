import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { attemptsApi } from "../../api";
import { Card, Stat, Badge, Spinner, Button } from "../../components/ui";
import { fmtDuration } from "../../lib/format";

export default function Result() {
  const { attemptId } = useParams();
  const [r, setR] = useState(null);
  useEffect(() => { attemptsApi.get(attemptId).then(setR); }, [attemptId]);
  if (!r) return <div className="grid place-items-center py-12"><Spinner size={28} /></div>;

  return (
    <div className="space-y-4 max-w-3xl">
      <Card title={r.quiz_title || "Result"} actions={<Badge tone={r.status === "PASSED" ? "green" : "red"}>{r.status}</Badge>}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Score" value={`${r.score}/${r.total_marks}`} />
          <Stat label="Percentage" value={`${r.percentage.toFixed(1)}%`} sub={`pass ${r.passing_score}%`} />
          <Stat label="Correct" value={`${r.correct_answers}/${r.total_questions}`} sub={`${r.incorrect_answers} wrong · ${r.unanswered} blank`} />
          <Stat label="Time" value={fmtDuration(r.time_taken)} />
        </div>
      </Card>

      <Card title="Review">
        <ol className="space-y-4">
          {r.review.map((q, i) => (
            <li key={q.question_id} className="border border-ink/10 rounded-sm p-3">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium text-ink">{i + 1}. {q.question_text}</p>
                <Badge tone={q.is_correct ? "green" : q.selected_option_id == null ? "amber" : "red"}>
                  {q.is_correct ? "Correct" : q.selected_option_id == null ? "Blank" : "Wrong"}
                </Badge>
              </div>
              <ul className="mt-2 space-y-1">
                {q.options.map((o) => {
                  const isCorrect = o.id === q.correct_option_id;
                  const isChosen = o.id === q.selected_option_id;
                  return (
                    <li key={o.id} className={`text-sm px-2 py-1 rounded-sm border ${isCorrect ? "border-green-400 bg-green-50" : isChosen ? "border-red-400 bg-red-50" : "border-transparent"}`}>
                      {o.option_text}
                      {isCorrect && <span className="text-green-700 text-xs ml-2">✓ correct</span>}
                      {isChosen && !isCorrect && <span className="text-red-700 text-xs ml-2">your answer</span>}
                    </li>
                  );
                })}
              </ul>
              {q.explanation && <p className="text-sm text-ink/60 mt-2 border-t border-ink/10 pt-2"><b>Explanation:</b> {q.explanation}</p>}
            </li>
          ))}
        </ol>
      </Card>

      <div className="flex gap-2">
        <Link to="/my-attempts"><Button variant="secondary">My attempts</Button></Link>
        <Link to="/"><Button>Browse more</Button></Link>
      </div>
    </div>
  );
}
