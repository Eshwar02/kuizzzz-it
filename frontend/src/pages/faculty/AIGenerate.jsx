import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { aiApi, quizzesApi } from "../../api";
import { Card, Input, Select, Button, Spinner } from "../../components/ui";
import DraftReviewList from "../../components/quiz/DraftReviewList";

const DIFFS = ["EASY", "INTERMEDIATE", "HARD"];

export default function AIGenerate() {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [mode, setMode] = useState("TOPIC");
  const [form, setForm] = useState({ topics: "", class_level: "", difficulty: "INTERMEDIATE", num_questions: 5, quiz_id: "" });
  const [file, setFile] = useState(null);
  const [phase, setPhase] = useState("idle"); // idle | generating | review | approving
  const [drafts, setDrafts] = useState([]);
  const [jobId, setJobId] = useState(null);
  const [error, setError] = useState("");
  const pollRef = useRef(null);

  useEffect(() => { quizzesApi.list({ mine: true }).then(setQuizzes).catch(() => {}); }, []);
  useEffect(() => () => clearInterval(pollRef.current), []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const poll = (id) => {
    pollRef.current = setInterval(async () => {
      const job = await aiApi.getJob(id);
      if (job.status === "COMPLETED") {
        clearInterval(pollRef.current);
        setDrafts(job.draft_questions);
        setPhase("review");
      } else if (job.status === "FAILED") {
        clearInterval(pollRef.current);
        setError(job.error || "Generation failed.");
        setPhase("idle");
      }
    }, 1500);
  };

  const generate = async () => {
    setError("");
    if (mode === "PDF" && !file) return setError("Choose a PDF file.");
    if (mode === "TOPIC" && !form.topics.trim()) return setError("Enter at least one topic.");
    setPhase("generating");
    try {
      const opts = { mode, ...form, num_questions: Number(form.num_questions), quiz_id: form.quiz_id ? Number(form.quiz_id) : null, file: mode === "PDF" ? file : null };
      const job = await aiApi.generate(opts);
      setJobId(job.id);
      if (job.status === "COMPLETED") { setDrafts(job.draft_questions); setPhase("review"); }
      else poll(job.id);
    } catch (e) {
      setError(e.response?.data?.detail || "Generation failed."); setPhase("idle");
    }
  };

  const approve = async () => {
    if (!form.quiz_id) return setError("Pick a quiz to add these questions to.");
    if (drafts.length === 0) return setError("No drafts to approve.");
    if (drafts.some((d) => d.options.filter((o) => o.is_correct).length !== 1)) return setError("Every question needs exactly one correct option.");
    setPhase("approving");
    try {
      await aiApi.approve(jobId, { quiz_id: Number(form.quiz_id), questions: drafts });
      navigate(`/faculty/quizzes/${form.quiz_id}/questions`);
    } catch (e) {
      setError(e.response?.data?.detail || "Approval failed."); setPhase("review");
    }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-semibold text-ink">AI question generation</h1>

      {phase !== "review" && (
        <Card title="Generate">
          <div className="space-y-3">
            <Select label="Mode" value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="TOPIC">Topic / syllabus</option>
              <option value="PDF">PDF material</option>
            </Select>
            {mode === "TOPIC" ? (
              <Input label="Topics (comma separated)" value={form.topics} onChange={(e) => set("topics", e.target.value)} />
            ) : (
              <label className="block">
                <span className="block text-sm font-medium text-ink/80 mb-1">PDF file</span>
                <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files[0] || null)} />
              </label>
            )}
            <div className="grid grid-cols-3 gap-3">
              <Input label="Class level" value={form.class_level} onChange={(e) => set("class_level", e.target.value)} />
              <Select label="Difficulty" value={form.difficulty} onChange={(e) => set("difficulty", e.target.value)}>
                {DIFFS.map((d) => <option key={d} value={d}>{d}</option>)}
              </Select>
              <Input label="How many" type="number" min={1} max={20} value={form.num_questions} onChange={(e) => set("num_questions", e.target.value)} />
            </div>
            <Select label="Target quiz (for approval)" value={form.quiz_id} onChange={(e) => set("quiz_id", e.target.value)}>
              <option value="">Choose a quiz…</option>
              {quizzes.map((q) => <option key={q.id} value={q.id}>{q.title}</option>)}
            </Select>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button onClick={generate} disabled={phase === "generating"}>
              {phase === "generating" ? <span className="flex items-center gap-2"><Spinner size={16} /> Generating…</span> : "Generate drafts"}
            </Button>
          </div>
        </Card>
      )}

      {phase === "review" || phase === "approving" ? (
        <Card title={`Review ${drafts.length} draft question(s)`} actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => { clearInterval(pollRef.current); setPhase("idle"); setDrafts([]); }}>Discard</Button>
            <Button onClick={approve} disabled={phase === "approving"}>{phase === "approving" ? "Approving…" : "Approve into quiz"}</Button>
          </div>
        }>
          <p className="text-sm text-ink/60 mb-3">These are drafts. Edit or drop any before approving. Nothing reaches students until approved.</p>
          <Select label="Target quiz" value={form.quiz_id} onChange={(e) => set("quiz_id", e.target.value)} className="mb-3">
            <option value="">Choose a quiz…</option>
            {quizzes.map((q) => <option key={q.id} value={q.id}>{q.title}</option>)}
          </Select>
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
          <DraftReviewList drafts={drafts} onChange={setDrafts} />
        </Card>
      ) : null}
    </div>
  );
}
