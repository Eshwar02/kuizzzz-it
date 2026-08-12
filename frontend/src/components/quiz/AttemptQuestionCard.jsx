import { forwardRef } from "react";
import { Input } from "../ui";

// selected: option id (single/tf) | array of ids (multiple) | string (blank)
// onSelect(question_id, nextValue)
const AttemptQuestionCard = forwardRef(function AttemptQuestionCard({ index, question, selected, onSelect }, ref) {
  const type = question.question_type;
  const isMulti = type === "MULTIPLE_CHOICE";
  const isBlank = type === "FILL_BLANK";

  const toggleMulti = (oid) => {
    const cur = Array.isArray(selected) ? selected : [];
    onSelect(question.id, cur.includes(oid) ? cur.filter((x) => x !== oid) : [...cur, oid]);
  };

  return (
    <div ref={ref} className="bg-card border border-ink/15 rounded-sm p-4 scroll-mt-24">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-medium text-ink">{index + 1}. {question.question_text}</h3>
        <span className="text-xs text-ink/50 shrink-0">
          {question.marks} mark{question.marks > 1 ? "s" : ""}
          {isMulti && <span className="ml-1">· select all</span>}
        </span>
      </div>

      {isBlank ? (
        <div className="mt-3">
          <Input placeholder="Type your answer" value={typeof selected === "string" ? selected : ""}
            onChange={(e) => onSelect(question.id, e.target.value)} />
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {question.options.map((o) => {
            const checked = isMulti ? (Array.isArray(selected) && selected.includes(o.id)) : selected === o.id;
            return (
              <label key={o.id} className={`flex items-center gap-3 border rounded-sm px-3 py-2 cursor-pointer ${checked ? "border-violet bg-violet/5" : "border-ink/15 hover:bg-surface"}`}>
                <input
                  type={isMulti ? "checkbox" : "radio"}
                  name={`q_${question.id}`}
                  checked={checked}
                  onChange={() => (isMulti ? toggleMulti(o.id) : onSelect(question.id, o.id))}
                />
                <span className="text-sm text-ink">{o.option_text}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
});

export default AttemptQuestionCard;
