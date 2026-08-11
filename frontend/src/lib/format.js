export const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString() : "—");
export const fmtDay = (iso) => (iso ? new Date(iso).toLocaleDateString() : "—");
export const fmtPct = (n) => `${Number(n ?? 0).toFixed(1)}%`;
export const fmtDuration = (secs) => {
  const s = Math.max(0, Math.floor(secs || 0));
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
};

// "UPCOMING" | "CLOSED" | "OPEN" from a quiz's availability window.
export const scheduleState = (quiz) => {
  const now = Date.now();
  if (quiz.available_from && now < new Date(quiz.available_from).getTime()) return "UPCOMING";
  if (quiz.available_until && now > new Date(quiz.available_until).getTime()) return "CLOSED";
  return "OPEN";
};
