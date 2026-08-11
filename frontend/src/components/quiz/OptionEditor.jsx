import { Button, Input } from "../ui";

// value: [{option_text, is_correct}]. Exactly one is_correct (radio semantics).
export default function OptionEditor({ value, onChange }) {
  const setText = (i, text) => onChange(value.map((o, idx) => idx === i ? { ...o, option_text: text } : o));
  const setCorrect = (i) => onChange(value.map((o, idx) => ({ ...o, is_correct: idx === i })));
  const add = () => { if (value.length < 6) onChange([...value, { option_text: "", is_correct: false }]); };
  const remove = (i) => {
    if (value.length <= 2) return;
    const next = value.filter((_, idx) => idx !== i);
    if (!next.some((o) => o.is_correct)) next[0] = { ...next[0], is_correct: true }; // keep exactly one (clone, don't mutate)
    onChange(next);
  };
  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium text-ink/80">Options (select the correct one)</span>
      {value.map((o, i) => (
        <div key={i} className="flex items-center gap-2">
          <input type="radio" name="correct_option" checked={o.is_correct} onChange={() => setCorrect(i)} title="Mark correct" />
          <Input className="flex-1" placeholder={`Option ${i + 1}`} value={o.option_text} onChange={(e) => setText(i, e.target.value)} />
          <Button type="button" variant="ghost" size="sm" onClick={() => remove(i)} disabled={value.length <= 2}>✕</Button>
        </div>
      ))}
      <Button type="button" variant="secondary" size="sm" onClick={add} disabled={value.length >= 6}>Add option</Button>
    </div>
  );
}
