import { useState } from "react";
import { Input, Select, Textarea, Button } from "../ui";
import OptionEditor from "./OptionEditor";

const DIFFS = ["EASY", "INTERMEDIATE", "HARD"];
const TYPES = [
  ["SINGLE_CHOICE", "Single choice"],
  ["MULTIPLE_CHOICE", "Multiple correct"],
  ["TRUE_FALSE", "True / False"],
  ["FILL_BLANK", "Fill in the blank"],
];
const emptyOptions = () => [{ option_text: "", is_correct: true }, { option_text: "", is_correct: false }];
const tfOptions = (correctIsTrue = true) => [
  { option_text: "True", is_correct: correctIsTrue },
  { option_text: "False", is_correct: !correctIsTrue },
];

export default function QuestionForm({ initial, onSubmit, onCancel }) {
  const [text, setText] = useState(initial?.question_text || "");
  const [marks, setMarks] = useState(initial?.marks ?? 1);
  const [explanation, setExplanation] = useState(initial?.explanation || "");
  const [difficulty, setDifficulty] = useState(initial?.difficulty || "INTERMEDIATE");
  const [type, setType] = useState(initial?.question_type || "SINGLE_CHOICE");
  const [options, setOptions] = useState(
    initial?.options?.map((o) => ({ option_text: o.option_text, is_correct: o.is_correct })) || emptyOptions()
  );
  const [accepted, setAccepted] = useState(
    initial?.accepted_answers?.length ? [...initial.accepted_answers] : [""]
  );
  const [error, setError] = useState("");

  const changeType = (t) => {
    setType(t);
    if (t === "TRUE_FALSE") setOptions(tfOptions(options[0]?.is_correct ?? true));
    else if ((t === "SINGLE_CHOICE" || t === "MULTIPLE_CHOICE") && options.length < 2) setOptions(emptyOptions());
  };

  const setAcc = (i, v) => setAccepted(accepted.map((a, idx) => (idx === i ? v : a)));
  const addAcc = () => setAccepted([...accepted, ""]);
  const rmAcc = (i) => setAccepted(accepted.length > 1 ? accepted.filter((_, idx) => idx !== i) : accepted);

  const submit = () => {
    if (!text.trim()) return setError("Question text is required.");
    const base = { question_text: text.trim(), marks: Number(marks), explanation: explanation || null, difficulty, question_type: type };
    if (type === "FILL_BLANK") {
      const clean = accepted.map((a) => a.trim()).filter(Boolean);
      if (!clean.length) return setError("Add at least one accepted answer.");
      return onSubmit({ ...base, accepted_answers: clean });
    }
    if (type !== "TRUE_FALSE" && (options.length < 2 || options.some((o) => !o.option_text.trim())))
      return setError("Fill all options (min 2).");
    const nCorrect = options.filter((o) => o.is_correct).length;
    if (type === "SINGLE_CHOICE" && nCorrect !== 1) return setError("Mark exactly one option correct.");
    if (type === "MULTIPLE_CHOICE" && nCorrect < 1) return setError("Mark at least one option correct.");
    if (type === "TRUE_FALSE" && nCorrect !== 1) return setError("Pick True or False as correct.");
    onSubmit({ ...base, options });
  };

  return (
    <div className="space-y-3">
      <Textarea label="Question" rows={2} value={text} onChange={(e) => setText(e.target.value)} />
      <div className="grid grid-cols-3 gap-3">
        <Select label="Type" value={type} onChange={(e) => changeType(e.target.value)}>
          {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
        <Input label="Marks" type="number" min={1} value={marks} onChange={(e) => setMarks(e.target.value)} />
        <Select label="Difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
          {DIFFS.map((d) => <option key={d} value={d}>{d}</option>)}
        </Select>
      </div>

      {type === "FILL_BLANK" ? (
        <div className="space-y-2">
          <span className="block text-sm font-medium text-ink/80">Accepted answers (case-insensitive)</span>
          {accepted.map((a, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input className="flex-1" placeholder={`Answer ${i + 1}`} value={a} onChange={(e) => setAcc(i, e.target.value)} />
              <Button type="button" variant="ghost" size="sm" onClick={() => rmAcc(i)} disabled={accepted.length <= 1}>✕</Button>
            </div>
          ))}
          <Button type="button" variant="secondary" size="sm" onClick={addAcc}>Add answer</Button>
        </div>
      ) : type === "TRUE_FALSE" ? (
        <div className="space-y-2">
          <span className="block text-sm font-medium text-ink/80">Correct answer</span>
          {["True", "False"].map((label, idx) => (
            <label key={label} className="flex items-center gap-2 text-sm text-ink">
              <input type="radio" name="tf_correct" checked={options[idx]?.is_correct || false}
                onChange={() => setOptions(tfOptions(idx === 0))} />
              {label}
            </label>
          ))}
        </div>
      ) : (
        <OptionEditor value={options} onChange={setOptions} multiple={type === "MULTIPLE_CHOICE"} />
      )}

      <Textarea label="Explanation (shown after submit)" rows={2} value={explanation} onChange={(e) => setExplanation(e.target.value)} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button onClick={submit}>Save question</Button>
      </div>
    </div>
  );
}
