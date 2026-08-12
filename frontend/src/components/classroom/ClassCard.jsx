import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
import Avatar from "../ui/Avatar";

// Glassmorphic class card: colored banner + faculty avatar (bottom-right, over the banner).
export default function ClassCard({ classroom, to, footer, children }) {
  const owner = classroom.owner_name || "Faculty";
  const inner = (
    <div className="relative hover-lift rounded-2xl overflow-hidden flex flex-col h-full bg-gradient-to-br from-white/75 to-violet/10 backdrop-blur-md border border-white/50 shadow-[0_8px_30px_rgba(43,39,64,0.12)]">
      {/* banner (clips only its own watermark) */}
      <div
        className="relative h-24 px-4 pt-4 text-white overflow-hidden"
        style={{ backgroundColor: classroom.theme_color || "#5549DA" }}
      >
        <BookOpen size={80} className="absolute -right-3 -bottom-4 opacity-15" />
        <h3 className="font-semibold text-lg leading-tight line-clamp-2 relative drop-shadow-sm">{classroom.name}</h3>
        {classroom.section && <p className="text-xs opacity-90 relative">{classroom.section}</p>}
      </div>

      {/* avatar: child of the card (not the banner) so it isn't clipped, and above the banner */}
      <span className="absolute right-4 top-[72px] z-10 rounded-full ring-4 ring-white shadow-md">
        <Avatar name={owner} size={48} />
      </span>

      {/* frosted body */}
      <div className="p-4 pt-5 text-sm text-ink/70 flex-1">
        <p className="font-medium text-ink">{owner}</p>
        <div className="mt-1">{children}</div>
      </div>

      {footer && (
        <div className="border-t border-white/40 px-4 py-2 flex items-center justify-end gap-3">{footer}</div>
      )}
    </div>
  );
  return to ? <Link to={to} className="block h-full">{inner}</Link> : inner;
}
