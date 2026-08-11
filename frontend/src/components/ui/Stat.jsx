export default function Stat({ label, value, sub }) {
  return (
    <div className="bg-card border border-ink/15 rounded-sm p-4">
      <div className="text-xs uppercase tracking-wide text-ink/50">{label}</div>
      <div className="text-2xl font-semibold text-ink mt-1">{value}</div>
      {sub && <div className="text-xs text-ink/50 mt-1">{sub}</div>}
    </div>
  );
}
