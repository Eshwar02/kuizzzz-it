export default function Card({ title, actions, children, className = "" }) {
  return (
    <section className={`bg-card border border-ink/15 rounded-sm ${className}`}>
      {(title || actions) && (
        <header className="flex items-center justify-between border-b border-ink/10 px-4 py-3">
          {title && <h2 className="font-semibold text-ink">{title}</h2>}
          {actions}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}
