import { NavLink } from "react-router-dom";
import {
  GraduationCap, Home, Compass, Users, ClipboardList, Trophy, LayoutDashboard,
  FileText, Sparkles, Tags, BarChart3,
} from "lucide-react";
import { useAuth } from "../../auth/AuthContext";

const NAV = {
  STUDENT: [
    ["/", "Home", Home], ["/browse", "Browse", Compass], ["/classes", "Classes", Users],
    ["/my-attempts", "My Attempts", ClipboardList], ["/leaderboard", "Leaderboard", Trophy],
    ["/dashboard", "Dashboard", LayoutDashboard],
  ],
  FACULTY: [
    ["/faculty", "Home", Home], ["/faculty/dashboard", "Dashboard", LayoutDashboard],
    ["/faculty/quizzes", "My Quizzes", FileText], ["/faculty/classes", "Classes", Users],
    ["/faculty/ai", "AI Generate", Sparkles],
  ],
  ADMIN: [
    ["/admin", "Dashboard", LayoutDashboard], ["/admin/users", "Users", Users],
    ["/admin/categories", "Categories", Tags], ["/admin/classes", "Classes", GraduationCap],
    ["/admin/analytics", "Analytics", BarChart3], ["/admin/attempts", "Attempts", ClipboardList],
  ],
};

export default function Sidebar() {
  const { user } = useAuth();
  const links = NAV[user?.role] || [];
  return (
    <aside className="w-56 shrink-0 bg-card border-r border-ink/15 h-screen overflow-y-auto p-3">
      <div className="flex items-center gap-2 px-2 py-3 mb-1">
        <span className="grid place-items-center h-8 w-8 rounded-md bg-violet text-white"><GraduationCap size={18} /></span>
        <span className="text-xl font-semibold text-violet-dark">Kuizzz</span>
      </div>
      <nav className="space-y-1">
        {links.map(([to, label, Icon]) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/" || to === "/faculty" || to === "/admin"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm border-l-2 ${
                isActive
                  ? "bg-violet text-white border-violet"
                  : "text-ink/80 border-transparent hover:bg-violet/5 hover:text-violet-dark"
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
