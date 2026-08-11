import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { attemptsApi } from "../../api";
import { Button, Spinner, Modal } from "../../components/ui";
import { useCountdown } from "../../lib/useCountdown";
import Timer from "../../components/quiz/Timer";
import Scratchpad from "../../components/quiz/Scratchpad";
import AttemptQuestionCard from "../../components/quiz/AttemptQuestionCard";
import QuestionPalette from "../../components/quiz/QuestionPalette";

export default function Attempt() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [answers, setAnswers] = useState({}); // question_id -> id | id[] | string
  const [current, setCurrent] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const submittedRef = useRef(false);
  const cardRefs = useRef({});

  useEffect(() => {
    attemptsApi.start(quizId).then((d) => setData(d))
      .catch(() => navigate(`/quizzes/${quizId}`));
  }, [quizId]);

  const isAnswered = (q) => {
    const v = answers[q.id];
    if (q.question_type === "MULTIPLE_CHOICE") return Array.isArray(v) && v.length > 0;
    if (q.question_type === "FILL_BLANK") return typeof v === "string" && v.trim() !== "";
    return v != null;
  };

  const doSubmit = async () => {
    if (submittedRef.current || !data) return;
    submittedRef.current = true;
    setSubmitting(true);
    const payload = {
      attempt_id: data.attempt_id,
      answers: data.questions.map((q) => {
        const v = answers[q.id];
        if (q.question_type === "MULTIPLE_CHOICE") return { question_id: q.id, selected_option_ids: v || [] };
        if (q.question_type === "FILL_BLANK") return { question_id: q.id, text_answer: v ?? "" };
        return { question_id: q.id, selected_option_id: v ?? null };
      }),
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

  const paged = data.attempt_layout === "PAGED";
  const answeredCount = data.questions.filter(isAnswered).length;
  const activeQ = data.questions[current]?.id ?? null;
  const setAnswer = (qid, val) => setAnswers((a) => ({ ...a, [qid]: val }));

  const jump = (i) => {
    setCurrent(i);
    if (!paged) cardRefs.current[data.questions[i].id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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
          {paged ? (
            <>
              <AttemptQuestionCard
                index={current}
                question={data.questions[current]}
                selected={answers[activeQ] ?? null}
                onSelect={setAnswer}
              />
              <div className="flex items-center justify-between">
                <Button variant="secondary" onClick={() => jump(current - 1)} disabled={current === 0}>← Previous</Button>
                <span className="text-sm text-ink/60">Question {current + 1} of {data.questions.length}</span>
                {current < data.questions.length - 1
                  ? <Button onClick={() => jump(current + 1)}>Next →</Button>
                  : <Button onClick={() => setConfirmOpen(true)} disabled={submitting}>Submit</Button>}
              </div>
            </>
          ) : (
            data.questions.map((q, i) => (
              <div key={q.id} onFocusCapture={() => setCurrent(i)} onClick={() => setCurrent(i)}>
                <AttemptQuestionCard
                  ref={(el) => { cardRefs.current[q.id] = el; }}
                  index={i}
                  question={q}
                  selected={answers[q.id] ?? null}
                  onSelect={setAnswer}
                />
              </div>
            ))
          )}
        </div>

        <div className="lg:sticky lg:top-20 h-fit space-y-4">
          <QuestionPalette questions={data.questions} isAnswered={isAnswered} current={current} onJump={jump} />
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
