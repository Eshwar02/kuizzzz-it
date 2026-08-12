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
          {r.review.map((q, i) => {
            const blank = q.question_type === "FILL_BLANK";
            const multi = q.question_type === "MULTIPLE_CHOICE";
            const chosenIds = multi ? (q.selected_option_ids || []) : (q.selected_option_id != null ? [q.selected_option_id] : []);
            const correctIds = q.correct_option_ids || (q.correct_option_id != null ? [q.correct_option_id] : []);
            const answered = blank ? !!(q.text_answer && q.text_answer.trim()) : chosenIds.length > 0;
            return (
              <li key={q.question_id} className="border border-ink/10 rounded-sm p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-ink">{i + 1}. {q.question_text}</p>
                  <Badge tone={q.is_correct ? "green" : !answered ? "amber" : "red"}>
                    {q.is_correct ? "Correct" : !answered ? "Blank" : "Wrong"}
                  </Badge>
                </div>

                {blank ? (
                  <div className="mt-2 space-y-1 text-sm">
                    <p className={`px-2 py-1 rounded-sm border ${q.is_correct ? "border-green-400 bg-green-50" : "border-red-400 bg-red-50"}`}>
                      Your answer: {q.text_answer?.trim() ? q.text_answer : <span className="text-ink/40">(blank)</span>}
                    </p>
                    <p className="px-2 py-1 text-ink/60">Accepted: {(q.accepted_answers || []).join(", ")}</p>
                  </div>
                ) : (
                  <ul className="mt-2 space-y-1">
                    {q.options.map((o) => {
                      const isCorrect = correctIds.includes(o.id);
                      const isChosen = chosenIds.includes(o.id);
                      return (
                        <li key={o.id} className={`text-sm px-2 py-1 rounded-sm border ${isCorrect ? "border-green-400 bg-green-50" : isChosen ? "border-red-400 bg-red-50" : "border-transparent"}`}>
                          {o.option_text}
                          {isCorrect && <span className="text-green-700 text-xs ml-2">✓ correct</span>}
                          {isChosen && !isCorrect && <span className="text-red-700 text-xs ml-2">your answer</span>}
                        </li>
                      );
                    })}
                  </ul>
                )}
                {q.explanation && <p className="text-sm text-ink/60 mt-2 border-t border-ink/10 pt-2"><b>Explanation:</b> {q.explanation}</p>}
              </li>
            );
          })}
        </ol>
      </Card>

      <div className="flex gap-2">
        <Link to="/my-attempts"><Button variant="secondary">My attempts</Button></Link>
        <Link to="/browse"><Button>Browse more</Button></Link>
      </div>
    </div>
  );
}
