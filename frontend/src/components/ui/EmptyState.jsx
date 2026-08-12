import { Inbox } from "lucide-react";

export default function EmptyState({ title = "Nothing here yet", message, action, icon: Icon = Inbox }) {
  return (
    <div className="text-center py-12 border border-dashed border-ink/20 rounded-sm bg-card">
      <span className="inline-grid place-items-center h-12 w-12 rounded-full bg-violet/10 text-violet mb-3">
        <Icon size={24} />
      </span>
      <p className="font-medium text-ink">{title}</p>
      {message && <p className="text-sm text-ink/50 mt-1">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
