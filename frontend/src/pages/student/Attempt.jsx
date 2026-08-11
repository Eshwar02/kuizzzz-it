import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { attemptsApi } from "../../api";
import { Button, Spinner, Modal } from "../../components/ui";
import { useCountdown } from "../../lib/useCountdown";
import Timer from "../../components/quiz/Timer";
import Scratchpad from "../../components/quiz/Scratchpad";
import AttemptQuestionCard from "../../components/quiz/AttemptQuestionCard";

export default function Attempt() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [answers, setAnswers] = useState({}); // question_id -> option_id
  const [activeQ, setActiveQ] = useState(null); // question id for scratchpad focus
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const submittedRef = useRef(false);

  useEffect(() => {
    attemptsApi.start(quizId).then((d) => { setData(d); setActiveQ(d.questions[0]?.id ?? null); })
      .catch(() => navigate(`/quizzes/${quizId}`));
  }, [quizId]);

  const doSubmit = async () => {
    if (submittedRef.current || !data) return;
    submittedRef.current = true;
    setSubmitting(true);
    const payload = {
      attempt_id: data.attempt_id,
      answers: data.questions.map((q) => ({ question_id: q.id, selected_option_id: answers[q.id] ?? null })),
    };
    try {
      const result = await attemptsApi.submit(quizId, payload);
      navigate(`/results/${result.id}`, { replace: true });
    } catch {
      submittedRef.current = false; setSubmitting(false);
    }
  };

  const remaining = useCountdown(data?.expires_at, doSubmit);

  if (!data) return <div className="grid place-items-center py-12"><Spinner size={28} /></div>;

  const answeredCount = Object.values(answers).filter((v) => v != null).length;

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 bg-surface/95 backdrop-blur border-b border-ink/10 -mx-6 px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-ink">{data.quiz_title}</h1>
          <p className="text-xs text-ink/50">{answeredCount}/{data.questions.length} answered</p>
        </div>
        <div className="flex items-center gap-3">
          <Timer seconds={remaining} />
          <Button onClick={() => setConfirmOpen(true)} disabled={submitting}>Submit</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        <div className="space-y-4">
          {data.questions.map((q, i) => (
            <div key={q.id} onFocusCapture={() => setActiveQ(q.id)} onClick={() => setActiveQ(q.id)}>
              <AttemptQuestionCard
                index={i}
                question={q}
                selected={answers[q.id] ?? null}
                onSelect={(qid, oid) => setAnswers((a) => ({ ...a, [qid]: oid }))}
              />
            </div>
          ))}
        </div>
        <div className="lg:sticky lg:top-20 h-fit">
          {activeQ != null && <Scratchpad attemptId={data.attempt_id} questionId={activeQ} />}
        </div>
      </div>

      <Modal
        open={confirmOpen}
        title="Submit attempt?"
        onClose={() => setConfirmOpen(false)}
        footer={<>
          <Button variant="secondary" onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button onClick={doSubmit} disabled={submitting}>{submitting ? "Submitting…" : "Submit"}</Button>
        </>}
      >
        You've answered {answeredCount} of {data.questions.length} questions. Unanswered questions score zero.
      </Modal>
    </div>
  );
}
