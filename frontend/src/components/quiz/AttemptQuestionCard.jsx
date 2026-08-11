export default function AttemptQuestionCard({ index, question, selected, onSelect }) {
  return (
    <div className="bg-card border border-ink/15 rounded-sm p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-medium text-ink">{index + 1}. {question.question_text}</h3>
        <span className="text-xs text-ink/50 shrink-0">{question.marks} mark{question.marks > 1 ? "s" : ""}</span>
      </div>
      <div className="mt-3 space-y-2">
        {question.options.map((o) => (
          <label key={o.id} className={`flex items-center gap-3 border rounded-sm px-3 py-2 cursor-pointer ${selected === o.id ? "border-violet bg-violet/5" : "border-ink/15 hover:bg-surface"}`}>
            <input
              type="radio"
              name={`q_${question.id}`}
              checked={selected === o.id}
              onChange={() => onSelect(question.id, o.id)}
            />
            <span className="text-sm text-ink">{o.option_text}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
