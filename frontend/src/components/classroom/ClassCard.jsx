import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";

// Reusable class card: colored header band + body slot + footer actions slot.
export default function ClassCard({ classroom, to, footer, children }) {
  const inner = (
    <div className="card-soft hover-lift overflow-hidden flex flex-col h-full">
      <div
        className="relative h-24 p-4 text-white flex flex-col justify-between overflow-hidden"
        style={{ backgroundColor: classroom.theme_color || "#B23A6F" }}
      >
        <BookOpen size={72} className="absolute -right-3 -bottom-3 opacity-15" />
        <h3 className="font-semibold text-lg leading-tight line-clamp-2 relative">{classroom.name}</h3>
        {classroom.section && <p className="text-xs opacity-90 relative">{classroom.section}</p>}
      </div>
      <div className="p-4 text-sm text-ink/70 flex-1">{children}</div>
      {footer && (
        <div className="border-t border-ink/10 px-4 py-2 flex items-center justify-end gap-3">{footer}</div>
      )}
    </div>
  );
  return to ? <Link to={to} className="block h-full">{inner}</Link> : inner;
}
