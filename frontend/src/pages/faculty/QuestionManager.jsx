import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { questionsApi, quizzesApi } from "../../api";
import { Card, Button, Modal, Badge, Spinner, EmptyState } from "../../components/ui";
import { toast } from "../../lib/toast";
import QuestionForm from "../../components/quiz/QuestionForm";

export default function QuestionManager() {
  const { id } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState(null);
  const [editing, setEditing] = useState(null); // question object or {} for new
  const [importResult, setImportResult] = useState(null); // { created, errors } | null
  const [importing, setImporting] = useState(false);
  const fileRef = useRef(null);
  const load = () => questionsApi.list(id).then(setQuestions);
  useEffect(() => { quizzesApi.get(id).then(setQuiz); load(); }, [id]);

  const save = async (payload) => {
    if (editing?.id) await questionsApi.update(editing.id, payload);
    else await questionsApi.create(id, payload);
    setEditing(null);
    load();
  };
  const remove = async (q) => { if (confirm("Delete this question?")) { await questionsApi.remove(q.id); load(); } };

  const onPickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    setImporting(true);
    try {
      const res = await questionsApi.importCsv(id, file);
      setImportResult(res);
      if (res.created > 0) { toast(`Imported ${res.created} question${res.created > 1 ? "s" : ""}`, "success"); load(); }
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = async () => {
    const blob = await questionsApi.downloadTemplate();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "questions-template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  if (!questions) return <div className="grid place-items-center py-12"><Spinner size={28} /></div>;
  return (
    <div className="space-y-4">
      <Link to="/faculty/quizzes" className="text-sm text-violet-dark">← Back to my quizzes</Link>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-semibold text-ink">Questions · {quiz?.title}</h1>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onPickFile} />
          <Button variant="secondary" onClick={downloadTemplate}>CSV template</Button>
          <Button variant="secondary" disabled={importing} onClick={() => fileRef.current?.click()}>
            {importing ? "Importing…" : "Import CSV"}
          </Button>
          <Button onClick={() => setEditing({})}>Add question</Button>
        </div>
      </div>

      {questions.length === 0 ? (
        <EmptyState title="No questions yet" message="Add questions before publishing this quiz." action={<Button onClick={() => setEditing({})}>Add question</Button>} />
      ) : (
        <div className="space-y-3">
          {questions.map((q, i) => (
            <Card key={q.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-ink">{i + 1}. {q.question_text}</p>
                  <div className="flex gap-2 mt-1">
                    <Badge tone="violet">{q.difficulty}</Badge>
                    <Badge>{q.marks} mark{q.marks > 1 ? "s" : ""}</Badge>
                    <Badge tone={q.source === "AI" ? "amber" : "neutral"}>{q.source}</Badge>
                  </div>
                  <ul className="mt-2 text-sm space-y-0.5">
                    {q.options.map((o) => (
                      <li key={o.id} className={o.is_correct ? "text-green-700" : "text-ink/60"}>
                        {o.is_correct ? "● " : "○ "}{o.option_text}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="secondary" onClick={() => setEditing(q)}>Edit</Button>
                  <Button size="sm" variant="danger" onClick={() => remove(q)}>Delete</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={importResult != null} title="Import results" onClose={() => setImportResult(null)}>
        {importResult != null && (
          <div className="space-y-3">
            <p className="text-sm text-ink">
              Imported <b className="text-green-700">{importResult.created}</b> question{importResult.created === 1 ? "" : "s"}.
              {importResult.errors.length > 0 && <> Skipped <b className="text-red-700">{importResult.errors.length}</b> row{importResult.errors.length === 1 ? "" : "s"}.</>}
            </p>
            {importResult.errors.length > 0 && (
              <div className="border border-red-200 bg-red-50 rounded-sm p-3 max-h-64 overflow-auto">
                <ul className="text-sm space-y-1">
                  {importResult.errors.map((e, i) => (
                    <li key={i}><b>Row {e.row}:</b> {e.message}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex justify-end"><Button onClick={() => setImportResult(null)}>Done</Button></div>
          </div>
        )}
      </Modal>

      <Modal open={editing != null} title={editing?.id ? "Edit question" : "Add question"} onClose={() => setEditing(null)}>
        {editing != null && (
          <QuestionForm initial={editing?.id ? editing : null} onSubmit={save} onCancel={() => setEditing(null)} />
        )}
      </Modal>
    </div>
  );
}
