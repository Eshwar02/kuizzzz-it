import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
import Avatar from "../ui/Avatar";

// Glassmorphic class card: colored banner + overlapping faculty avatar + frosted body.
export default function ClassCard({ classroom, to, footer, children }) {
  const owner = classroom.owner_name || "Faculty";
  const inner = (
    <div className="hover-lift rounded-2xl overflow-hidden flex flex-col h-full bg-gradient-to-br from-white/75 to-violet/10 backdrop-blur-md border border-white/50 shadow-[0_8px_30px_rgba(43,39,64,0.12)]">
      {/* banner (clips the watermark, not the avatar) */}
      <div
        className="relative h-24 px-4 pt-4 text-white overflow-hidden"
        style={{ backgroundColor: classroom.theme_color || "#5549DA" }}
      >
        <BookOpen size={80} className="absolute -right-3 -bottom-4 opacity-15" />
        <h3 className="font-semibold text-lg leading-tight line-clamp-2 relative drop-shadow-sm">{classroom.name}</h3>
        {classroom.section && <p className="text-xs opacity-90 relative">{classroom.section}</p>}
      </div>

      {/* frosted body; avatar pulled up to overlap the banner */}
      <div className="p-4 text-sm text-ink/70 flex-1">
        <div className="flex items-center gap-3 -mt-11 mb-3">
          <span className="rounded-full ring-4 ring-white shadow-md shrink-0">
            <Avatar name={owner} size={48} />
          </span>
          <p className="font-medium text-ink pt-8 truncate">{owner}</p>
        </div>
        {children}
      </div>

      {footer && (
        <div className="border-t border-white/40 px-4 py-2 flex items-center justify-end gap-3">{footer}</div>
      )}
    </div>
  );
  return to ? <Link to={to} className="block h-full">{inner}</Link> : inner;
}
