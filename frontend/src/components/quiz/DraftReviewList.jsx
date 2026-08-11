import { useState } from "react";
import { Card, Button, Modal, Badge } from "../ui";
import QuestionForm from "./QuestionForm";

// drafts: array of DraftQuestion. Faculty can edit or drop each before approving.
export default function DraftReviewList({ drafts, onChange }) {
  const [editIdx, setEditIdx] = useState(null);
  const update = (idx, q) => { onChange(drafts.map((d, i) => (i === idx ? q : d))); setEditIdx(null); };
  const drop = (idx) => onChange(drafts.filter((_, i) => i !== idx));

  return (
    <div className="space-y-3">
      {drafts.map((d, i) => {
        const correct = d.options.find((o) => o.is_correct);
        return (
          <Card key={i}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-ink">{i + 1}. {d.question_text}</p>
                <div className="flex gap-2 mt-1"><Badge tone="violet">{d.difficulty}</Badge><Badge>{d.marks} mark(s)</Badge></div>
                <ul className="mt-2 text-sm space-y-0.5">
                  {d.options.map((o, oi) => (
                    <li key={oi} className={o.is_correct ? "text-green-700" : "text-ink/60"}>{o.is_correct ? "● " : "○ "}{o.option_text}</li>
                  ))}
                </ul>
                {d.explanation && <p className="text-xs text-ink/50 mt-1">Explanation: {d.explanation}</p>}
                {!correct && <p className="text-xs text-red-600 mt-1">No correct option — edit before approving.</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="secondary" onClick={() => setEditIdx(i)}>Edit</Button>
                <Button size="sm" variant="danger" onClick={() => drop(i)}>Drop</Button>
              </div>
            </div>
          </Card>
        );
      })}
      <Modal open={editIdx != null} title="Edit draft" onClose={() => setEditIdx(null)}>
        {editIdx != null && (
          <QuestionForm initial={drafts[editIdx]} onSubmit={(q) => update(editIdx, q)} onCancel={() => setEditIdx(null)} />
        )}
      </Modal>
    </div>
  );
}
