export default function EmptyState({ title = "Nothing here yet", message, action }) {
  return (
    <div className="text-center py-12 border border-dashed border-ink/20 rounded-sm bg-card">
      <p className="font-medium text-ink">{title}</p>
      {message && <p className="text-sm text-ink/50 mt-1">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
