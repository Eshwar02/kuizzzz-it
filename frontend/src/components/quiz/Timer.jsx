export default function Timer({ seconds }) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const danger = seconds <= 60;
  return (
    <div className={`px-3 py-1.5 rounded-sm border text-sm font-mono ${danger ? "border-red-500 text-red-600 bg-red-50" : "border-ink/20 text-ink bg-card"}`}>
      {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </div>
  );
}
