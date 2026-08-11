import { useState } from "react";
import { Input, Select, Textarea, Button } from "../ui";
import OptionEditor from "./OptionEditor";

const DIFFS = ["EASY", "INTERMEDIATE", "HARD"];
const emptyOptions = () => [{ option_text: "", is_correct: true }, { option_text: "", is_correct: false }];

export default function QuestionForm({ initial, onSubmit, onCancel }) {
  const [text, setText] = useState(initial?.question_text || "");
  const [marks, setMarks] = useState(initial?.marks ?? 1);
  const [explanation, setExplanation] = useState(initial?.explanation || "");
  const [difficulty, setDifficulty] = useState(initial?.difficulty || "INTERMEDIATE");
  const [options, setOptions] = useState(
    initial?.options?.map((o) => ({ option_text: o.option_text, is_correct: o.is_correct })) || emptyOptions()
  );
  const [error, setError] = useState("");

  const submit = () => {
    if (!text.trim()) return setError("Question text is required.");
    if (options.length < 2 || options.some((o) => !o.option_text.trim())) return setError("Fill all options (min 2).");
    if (options.filter((o) => o.is_correct).length !== 1) return setError("Mark exactly one option correct.");
    onSubmit({ question_text: text.trim(), marks: Number(marks), explanation: explanation || null, difficulty, options });
  };

  return (
    <div className="space-y-3">
      <Textarea label="Question" rows={2} value={text} onChange={(e) => setText(e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Marks" type="number" min={1} value={marks} onChange={(e) => setMarks(e.target.value)} />
        <Select label="Difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
          {DIFFS.map((d) => <option key={d} value={d}>{d}</option>)}
        </Select>
      </div>
      <OptionEditor value={options} onChange={setOptions} />
      <Textarea label="Explanation (shown after submit)" rows={2} value={explanation} onChange={(e) => setExplanation(e.target.value)} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button onClick={submit}>Save question</Button>
      </div>
    </div>
  );
}
