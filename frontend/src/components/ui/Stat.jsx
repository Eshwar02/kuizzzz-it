import Gauge from "./Gauge";

export default function Stat({ label, value, sub, icon: Icon, tone = "#0D9488", ring }) {
  return (
    <div className="card-soft p-4 flex items-center gap-3">
      {ring != null ? (
        <Gauge value={ring} size={56} tone={tone} />
      ) : Icon ? (
        <span className="grid place-items-center h-10 w-10 rounded-sm shrink-0" style={{ backgroundColor: `${tone}1A`, color: tone }}>
          <Icon size={20} />
        </span>
      ) : null}
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-wide text-ink/50">{label}</div>
        <div className="text-2xl font-semibold text-ink leading-tight">{value}</div>
        {sub && <div className="text-xs text-ink/50 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}
