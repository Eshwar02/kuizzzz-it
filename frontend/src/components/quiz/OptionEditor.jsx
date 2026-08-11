import { Button, Input } from "../ui";

// value: [{option_text, is_correct}].
// single (default): radio semantics, exactly one correct.
// multiple: checkbox semantics, >=1 correct.
export default function OptionEditor({ value, onChange, multiple = false }) {
  const setText = (i, text) => onChange(value.map((o, idx) => idx === i ? { ...o, option_text: text } : o));
  const setSingle = (i) => onChange(value.map((o, idx) => ({ ...o, is_correct: idx === i })));
  const toggle = (i) => onChange(value.map((o, idx) => idx === i ? { ...o, is_correct: !o.is_correct } : o));
  const add = () => { if (value.length < 6) onChange([...value, { option_text: "", is_correct: false }]); };
  const remove = (i) => {
    if (value.length <= 2) return;
    const next = value.filter((_, idx) => idx !== i);
    if (!multiple && !next.some((o) => o.is_correct)) next[0] = { ...next[0], is_correct: true };
    onChange(next);
  };
  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium text-ink/80">
        {multiple ? "Options (check all correct)" : "Options (select the correct one)"}
      </span>
      {value.map((o, i) => (
        <div key={i} className="flex items-center gap-2">
          {multiple ? (
            <input type="checkbox" checked={o.is_correct} onChange={() => toggle(i)} title="Mark correct" />
          ) : (
            <input type="radio" name="correct_option" checked={o.is_correct} onChange={() => setSingle(i)} title="Mark correct" />
          )}
          <Input className="flex-1" placeholder={`Option ${i + 1}`} value={o.option_text} onChange={(e) => setText(i, e.target.value)} />
          <Button type="button" variant="ghost" size="sm" onClick={() => remove(i)} disabled={value.length <= 2}>✕</Button>
        </div>
      ))}
      <Button type="button" variant="secondary" size="sm" onClick={add} disabled={value.length >= 6}>Add option</Button>
    </div>
  );
}
