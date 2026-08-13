import { NavLink, Link } from "react-router-dom";
import {
  GraduationCap, Home, Compass, Users, ClipboardList, Trophy, LayoutDashboard,
  FileText, Sparkles, Tags, BarChart3, ChevronDown,
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

// Role-aware targets for the logo hover menu: home + Classrooms / Quiz dashboard / Analytics.
const BRAND = {
  STUDENT: {
    home: "/",
    menu: [
      ["/classes", "Classrooms", Users],
      ["/dashboard", "Quiz dashboard", LayoutDashboard],
      ["/leaderboard", "Analytics", BarChart3],
    ],
  },
  FACULTY: {
    home: "/faculty",
    menu: [
      ["/faculty/classes", "Classrooms", Users],
      ["/faculty/quizzes", "Quiz dashboard", LayoutDashboard],
      ["/faculty/dashboard", "Analytics", BarChart3],
    ],
  },
  ADMIN: {
    home: "/admin",
    menu: [
      ["/admin/classes", "Classrooms", Users],
      ["/admin", "Quiz dashboard", LayoutDashboard],
      ["/admin/analytics", "Analytics", BarChart3],
    ],
  },
};

export default function Sidebar() {
  const { user } = useAuth();
  const links = NAV[user?.role] || [];
  const brand = BRAND[user?.role] || BRAND.STUDENT;
  return (
    <aside className="w-56 shrink-0 bg-card border-r border-ink/15 h-screen overflow-y-auto p-3">
      {/* Brand: click logo → home; hover → quick-nav dropdown. */}
      <div className="relative group mb-1">
        <Link
          to={brand.home}
          title="Go to home"
          className="flex items-center gap-2 px-2 py-3 rounded-md hover:bg-violet/5 transition"
        >
          <img src={logo} alt="Kuizzz" className="h-9 w-9 rounded-md shrink-0" />
          <span className="text-xl font-semibold text-violet-dark truncate">Kuizzz</span>
          <ChevronDown size={16} className="ml-auto text-ink/40 group-hover:text-violet transition" />
        </Link>
        {/* pt-1 keeps the hover bridge alive between the logo and the menu */}
        <div className="absolute left-0 right-0 top-full z-40 pt-1 hidden group-hover:block">
          <div className="rounded-md border border-ink/15 bg-card shadow-lg overflow-hidden">
            {brand.menu.map(([to, label, Icon]) => (
              <NavLink
                key={label}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 text-sm ${
                    isActive
                      ? "bg-violet/10 text-violet-dark"
                      : "text-ink/80 hover:bg-violet/10 hover:text-violet-dark"
                  }`
                }
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </div>
        </div>
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
