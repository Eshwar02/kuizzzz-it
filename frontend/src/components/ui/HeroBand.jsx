export default function HeroBand({ title, subtitle, chips, actions }) {
  return (
    <div className="rounded-sm p-6 text-white bg-gradient-to-br from-violet-dark to-violet flex flex-wrap items-center justify-between gap-4 shadow-[0_6px_20px_rgba(43,39,64,0.15)]">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {subtitle && <p className="opacity-90 text-sm mt-1">{subtitle}</p>}
        {chips && <div className="flex flex-wrap gap-2 mt-3">{chips}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
