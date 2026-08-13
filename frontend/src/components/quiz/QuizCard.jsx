import { Link } from "react-router-dom";
import { ListChecks, Clock, Target, Users } from "lucide-react";
import { Badge, Button } from "../ui";
import { scheduleState } from "../../lib/format";

const diffTone = { EASY: "green", INTERMEDIATE: "violet", HARD: "red" };
const diffAccent = { EASY: "#2F855A", INTERMEDIATE: "#5549DA", HARD: "#C53030" };

export default function QuizCard({ quiz }) {
  const sched = scheduleState(quiz);
  return (
    <div className="card-soft hover-lift border-l-[3px] p-4 flex flex-col" style={{ borderLeftColor: diffAccent[quiz.difficulty] || "#5549DA" }}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-ink">{quiz.title}</h3>
        <div className="flex items-center gap-1.5 shrink-0">
          {sched === "UPCOMING" && <Badge tone="amber">Upcoming</Badge>}
          {sched === "CLOSED" && <Badge tone="red">Closed</Badge>}
          <Badge tone={diffTone[quiz.difficulty]}>{quiz.difficulty}</Badge>
        </div>
      </div>
      <p className="text-sm text-ink/60 mt-1 line-clamp-2 min-h-[2.5rem]">{quiz.description || "No description."}</p>
      <div className="text-xs text-ink/50 mt-3 space-y-1">
        <div>{quiz.category_name || "Uncategorized"}</div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1"><ListChecks size={14} /> {quiz.question_count} Qs</span>
          <span className="inline-flex items-center gap-1"><Clock size={14} /> {quiz.duration_minutes} min</span>
          <span className="inline-flex items-center gap-1"><Target size={14} /> pass {quiz.passing_score}%</span>
          {quiz.attempt_count > 0 && (
            <span className="inline-flex items-center gap-1"><Users size={14} /> {quiz.attempt_count} taken</span>
          )}
        </div>
      </div>
      <Link to={`/quizzes/${quiz.id}`} className="mt-4"><Button className="w-full">View</Button></Link>
    </div>
  );
}
