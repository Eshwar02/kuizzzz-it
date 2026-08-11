export default function Modal({ open, title, onClose, children, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 bg-ink/40 grid place-items-center p-4" onClick={onClose}>
      <div className="bg-card border border-ink/20 rounded-sm w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-ink/10 px-4 py-3">
          <h3 className="font-semibold text-ink">{title}</h3>
          <button className="text-ink/50 hover:text-ink" onClick={onClose}>✕</button>
        </header>
        <div className="p-4">{children}</div>
        {footer && <footer className="border-t border-ink/10 px-4 py-3 flex justify-end gap-2">{footer}</footer>}
      </div>
    </div>
  );
}
