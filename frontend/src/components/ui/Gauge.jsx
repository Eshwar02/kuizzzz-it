export default function Gauge({ value = 0, size = 96, label, tone = "#0D9488" }) {
  const v = Math.max(0, Math.min(100, value));
  const stroke = 8, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return (
    <div className="inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 col-start-1 row-start-1">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#2B274015" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tone} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} />
      </svg>
      <div className="col-start-1 row-start-1 text-center">
        <div className="text-lg font-semibold text-ink leading-none">{Math.round(v)}%</div>
        {label && <div className="text-[10px] uppercase tracking-wide text-ink/50 mt-0.5">{label}</div>}
      </div>
    </div>
  );
}
