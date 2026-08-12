import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
import Avatar from "../ui/Avatar";

// Glassmorphic class card: colored banner + overlapping faculty avatar + frosted body.
export default function ClassCard({ classroom, to, footer, children }) {
  const owner = classroom.owner_name || "Faculty";
  const inner = (
    <div className="hover-lift rounded-2xl overflow-hidden flex flex-col h-full bg-gradient-to-br from-white/75 to-violet/10 backdrop-blur-md border border-white/50 shadow-[0_8px_30px_rgba(43,39,64,0.12)]">
      {/* banner */}
      <div
        className="relative h-24 px-4 pt-4 text-white overflow-hidden"
        style={{ backgroundColor: classroom.theme_color || "#5549DA" }}
      >
        <BookOpen size={80} className="absolute -right-3 -bottom-4 opacity-15" />
        <h3 className="font-semibold text-lg leading-tight line-clamp-2 relative drop-shadow-sm">{classroom.name}</h3>
        {classroom.section && <p className="text-xs opacity-90 relative">{classroom.section}</p>}
        {/* overlapping faculty profile (GCR-style) */}
        <div className="absolute -bottom-5 right-4">
          <span className="block rounded-full ring-4 ring-white/80 shadow-md">
            <Avatar name={owner} size={44} />
          </span>
        </div>
      </div>

      {/* frosted body */}
      <div className="p-4 pt-6 text-sm text-ink/70 flex-1">
        <p className="font-medium text-ink leading-tight">{owner}</p>
        <div className="mt-1">{children}</div>
      </div>

      {footer && (
        <div className="border-t border-white/40 px-4 py-2 flex items-center justify-end gap-3">{footer}</div>
      )}
    </div>
  );
  return to ? <Link to={to} className="block h-full">{inner}</Link> : inner;
}
