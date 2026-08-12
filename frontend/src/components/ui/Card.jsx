export default function Card({ title, actions, children, className = "", accent, icon: Icon }) {
  return (
    <section
      className={`card-soft ${accent ? "border-l-[3px]" : ""} ${className}`}
      style={accent ? { borderLeftColor: accent } : undefined}
    >
      {(title || actions) && (
        <header className="flex items-center justify-between border-b border-ink/10 px-4 py-3">
          <h2 className="font-semibold text-ink flex items-center gap-2">
            {Icon && <Icon size={18} className="text-violet" />}
            {title}
          </h2>
          {actions}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}
