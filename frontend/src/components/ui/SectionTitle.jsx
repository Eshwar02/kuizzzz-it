export default function SectionTitle({ children, action }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <h2 className="text-sm font-semibold text-ink/60 uppercase tracking-wide">{children}</h2>
      {action}
    </div>
  );
}
