import { useEffect, useRef, useState } from "react";
import { Button } from "../ui";

// Per-question rough work. Local only: never submitted, never graded.
// Persisted to localStorage keyed by attempt+question so switching questions keeps notes.
export default function Scratchpad({ attemptId, questionId }) {
  const notesKey = `scratch_notes_${attemptId}_${questionId}`;
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const [notes, setNotes] = useState("");

  useEffect(() => { setNotes(localStorage.getItem(notesKey) || ""); }, [notesKey]);
  useEffect(() => {
    const c = canvasRef.current;
    if (c) { const ctx = c.getContext("2d"); ctx.clearRect(0, 0, c.width, c.height); }
  }, [questionId]);

  const pos = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return { x: p.clientX - r.left, y: p.clientY - r.top };
  };
  const startDraw = (e) => { drawing.current = true; const { x, y } = pos(e); const ctx = canvasRef.current.getContext("2d"); ctx.beginPath(); ctx.moveTo(x, y); };
  const move = (e) => {
    if (!drawing.current) return;
    const { x, y } = pos(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.strokeStyle = "#2B2740"; ctx.lineWidth = 2; ctx.lineCap = "round";
    ctx.lineTo(x, y); ctx.stroke();
  };
  const end = () => { drawing.current = false; };
  const clear = () => { const c = canvasRef.current; c.getContext("2d").clearRect(0, 0, c.width, c.height); };

  return (
    <div className="bg-card border border-ink/15 rounded-sm p-3 w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wide text-ink/50">Scratchpad (not submitted)</span>
        <Button variant="ghost" size="sm" onClick={clear}>Clear</Button>
      </div>
      <canvas
        ref={canvasRef}
        width={280}
        height={200}
        className="border border-ink/15 rounded-sm w-full touch-none bg-white"
        onMouseDown={startDraw} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={startDraw} onTouchMove={move} onTouchEnd={end}
      />
      <textarea
        className="mt-2 w-full border border-ink/20 rounded-sm px-2 py-1 text-sm h-24"
        placeholder="Typed rough work…"
        value={notes}
        onChange={(e) => { setNotes(e.target.value); localStorage.setItem(notesKey, e.target.value); }}
      />
    </div>
  );
}
