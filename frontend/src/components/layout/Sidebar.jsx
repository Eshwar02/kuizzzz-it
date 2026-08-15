import { NavLink, Link } from "react-router-dom";
import {
  GraduationCap, Home, Compass, Users, ClipboardList, Trophy, LayoutDashboard,
  FileText, Sparkles, Tags, BarChart3,
} from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import logo from "../../assets/logo.svg";

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

// Role-aware home target for the logo link.
const BRAND = {
  STUDENT: { home: "/" },
  FACULTY: { home: "/faculty" },
  ADMIN: { home: "/admin" },
};

export default function Sidebar() {
  const { user } = useAuth();
  const links = NAV[user?.role] || [];
  const brand = BRAND[user?.role] || BRAND.STUDENT;
  return (
    <aside className="w-60 shrink-0 bg-card border-r border-ink/15 h-screen overflow-y-auto p-3.5">
      {/* Brand: click logo → home. */}
      <Link
        to={brand.home}
        title="Go to home"
        className="flex items-center gap-2 px-2 py-3 mb-1"
      >
        <img src={logo} alt="Kuizzz" className="h-9 w-9 rounded-md shrink-0" />
        <span className="text-xl font-semibold text-violet-dark truncate">Kuizzz</span>
      </Link>
      <nav className="space-y-2">
        {links.map(([to, label, Icon]) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/" || to === "/faculty" || to === "/admin"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-md text-sm border-l-2 transition ${
                isActive
                  ? "bg-violet text-white border-violet"
                  : "text-ink/80 border-transparent hover:bg-violet/5 hover:text-violet-dark hover:shadow-[0_2px_8px_rgba(43,39,64,0.10)]"
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
