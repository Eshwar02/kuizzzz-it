// Numbered navigator shared by scroll + paged layouts.
// questions: array; isAnswered(q) -> bool; current: index; onJump(index)
export default function QuestionPalette({ questions, isAnswered, current, onJump }) {
  return (
    <div className="bg-card border border-ink/15 rounded-sm p-3">
      <p className="text-xs font-medium text-ink/60 mb-2">Questions</p>
      <div className="grid grid-cols-6 gap-1.5">
        {questions.map((q, i) => {
          const answered = isAnswered(q);
          const isCurrent = i === current;
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => onJump(i)}
              title={answered ? "Answered" : "Not answered"}
              className={[
                "h-8 w-8 text-xs border rounded-sm grid place-items-center",
                answered ? "bg-violet text-white border-violet" : "bg-surface text-ink border-ink/20",
                isCurrent ? "ring-2 ring-violet-dark" : "",
              ].join(" ")}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex items-center gap-3 text-[11px] text-ink/50">
        <span className="inline-flex items-center gap-1"><span className="h-3 w-3 bg-violet inline-block rounded-sm" /> answered</span>
        <span className="inline-flex items-center gap-1"><span className="h-3 w-3 border border-ink/20 inline-block rounded-sm" /> pending</span>
      </div>
    </div>
  );
}
