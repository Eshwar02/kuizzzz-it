import { Link } from "react-router-dom";
import { Badge, Button } from "../ui";
import { scheduleState } from "../../lib/format";

const diffTone = { EASY: "green", INTERMEDIATE: "violet", HARD: "red" };

export default function QuizCard({ quiz }) {
  const sched = scheduleState(quiz);
  return (
    <div className="bg-card border border-ink/15 rounded-sm p-4 flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-ink">{quiz.title}</h3>
        <div className="flex items-center gap-1.5 shrink-0">
          {sched === "UPCOMING" && <Badge tone="amber">Upcoming</Badge>}
          {sched === "CLOSED" && <Badge tone="red">Closed</Badge>}
          <Badge tone={diffTone[quiz.difficulty]}>{quiz.difficulty}</Badge>
        </div>
      </div>
      <p className="text-sm text-ink/60 mt-1 line-clamp-2 min-h-[2.5rem]">{quiz.description || "No description."}</p>
      <div className="text-xs text-ink/50 mt-3 space-y-0.5">
        <div>{quiz.category_name || "Uncategorized"}</div>
        <div>{quiz.question_count} questions · {quiz.duration_minutes} min · pass {quiz.passing_score}%</div>
      </div>
      <Link to={`/quizzes/${quiz.id}`} className="mt-4"><Button className="w-full">View</Button></Link>
    </div>
  );
}
