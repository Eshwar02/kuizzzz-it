import { Link } from "react-router-dom";

// Reusable class card: colored header band + body slot + footer actions slot.
export default function ClassCard({ classroom, to, footer, children }) {
  const inner = (
    <div className="bg-card border border-ink/15 rounded-sm overflow-hidden flex flex-col h-full">
      <div
        className="h-24 p-4 text-white flex flex-col justify-between"
        style={{ backgroundColor: classroom.theme_color || "#B23A6F" }}
      >
        <h3 className="font-semibold text-lg leading-tight line-clamp-2">{classroom.name}</h3>
        {classroom.section && <p className="text-xs opacity-90">{classroom.section}</p>}
      </div>
      <div className="p-4 text-sm text-ink/70 flex-1">{children}</div>
      {footer && (
        <div className="border-t border-ink/10 px-4 py-2 flex items-center justify-end gap-3">{footer}</div>
      )}
    </div>
  );
  return to ? <Link to={to} className="block h-full">{inner}</Link> : inner;
}
