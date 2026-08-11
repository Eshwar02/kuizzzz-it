import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { questionsApi, quizzesApi } from "../../api";
import { Card, Button, Modal, Badge, Spinner, EmptyState } from "../../components/ui";
import QuestionForm from "../../components/quiz/QuestionForm";

export default function QuestionManager() {
  const { id } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState(null);
  const [editing, setEditing] = useState(null); // question object or {} for new
  const load = () => questionsApi.list(id).then(setQuestions);
  useEffect(() => { quizzesApi.get(id).then(setQuiz); load(); }, [id]);

  const save = async (payload) => {
    if (editing?.id) await questionsApi.update(editing.id, payload);
    else await questionsApi.create(id, payload);
    setEditing(null);
    load();
  };
  const remove = async (q) => { if (confirm("Delete this question?")) { await questionsApi.remove(q.id); load(); } };

  if (!questions) return <div className="grid place-items-center py-12"><Spinner size={28} /></div>;
  return (
    <div className="space-y-4">
      <Link to="/faculty/quizzes" className="text-sm text-violet-dark">← Back to my quizzes</Link>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">Questions · {quiz?.title}</h1>
        <Button onClick={() => setEditing({})}>Add question</Button>
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

      <Modal open={editing != null} title={editing?.id ? "Edit question" : "Add question"} onClose={() => setEditing(null)}>
        {editing != null && (
          <QuestionForm initial={editing?.id ? editing : null} onSubmit={save} onCancel={() => setEditing(null)} />
        )}
      </Modal>
    </div>
  );
}
