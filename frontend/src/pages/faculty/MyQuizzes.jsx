import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { quizzesApi } from "../../api";
import { Card, Table, Button, Badge, Spinner } from "../../components/ui";
import AssignDialog from "../../components/quiz/AssignDialog";

const statusTone = { PUBLISHED: "green", DRAFT: "amber", UNPUBLISHED: "neutral" };

export default function MyQuizzes() {
  const [rows, setRows] = useState(null);
  const [assignQuiz, setAssignQuiz] = useState(null);
  const load = () => quizzesApi.list({ mine: true }).then(setRows);
  useEffect(() => { load(); }, []);

  const togglePublish = async (q) => {
    const next = q.status === "PUBLISHED" ? "UNPUBLISHED" : "PUBLISHED";
    await quizzesApi.setPublish(q.id, next);
    load();
  };
  const remove = async (q) => {
    if (!confirm(`Delete "${q.title}"? This removes its questions and cannot be undone.`)) return;
    await quizzesApi.remove(q.id);
    load();
  };

  if (!rows) return <div className="grid place-items-center py-12"><Spinner size={28} /></div>;
  const columns = [
    { key: "title", header: "Title" },
    { key: "status", header: "Status", render: (r) => <Badge tone={statusTone[r.status]}>{r.status}</Badge> },
    { key: "visibility", header: "Audience", render: (r) => <Badge tone={r.visibility === "ASSIGNED" ? "violet" : "neutral"}>{r.visibility === "ASSIGNED" ? "Assigned" : "Open"}</Badge> },
    { key: "question_count", header: "Questions" },
    { key: "difficulty", header: "Difficulty" },
    { key: "actions", header: "", render: (r) => (
      <div className="flex flex-wrap gap-2 justify-end">
        <Link to={`/faculty/quizzes/${r.id}/questions`}><Button size="sm" variant="secondary">Questions</Button></Link>
        <Link to={`/faculty/quizzes/${r.id}/edit`}><Button size="sm" variant="secondary">Edit</Button></Link>
        <Link to={`/faculty/quizzes/${r.id}/results`}><Button size="sm" variant="ghost">Results</Button></Link>
        <Button size="sm" variant="secondary" onClick={() => setAssignQuiz(r)}>Assign</Button>
        <Button size="sm" onClick={() => togglePublish(r)} disabled={r.status !== "PUBLISHED" && r.question_count === 0}>
          {r.status === "PUBLISHED" ? "Unpublish" : "Publish"}
        </Button>
        <Button size="sm" variant="danger" onClick={() => remove(r)}>Delete</Button>
      </div>
    ) },
  ];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">My quizzes</h1>
        <Link to="/faculty/quizzes/new"><Button>New quiz</Button></Link>
      </div>
      <Card><Table columns={columns} rows={rows} empty="No quizzes yet. Create one to get started." /></Card>
      {assignQuiz && (
        <AssignDialog
          quizId={assignQuiz.id}
          open={!!assignQuiz}
          onClose={() => setAssignQuiz(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
