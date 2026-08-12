import { NavLink } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

const NAV = {
  STUDENT: [
    ["/", "Home"], ["/browse", "Browse"], ["/classes", "Classes"], ["/my-attempts", "My Attempts"], ["/leaderboard", "Leaderboard"], ["/dashboard", "Dashboard"],
  ],
  FACULTY: [
    ["/faculty", "Home"], ["/faculty/dashboard", "Dashboard"], ["/faculty/quizzes", "My Quizzes"], ["/faculty/classes", "Classes"], ["/faculty/ai", "AI Generate"],
  ],
  ADMIN: [
    ["/admin", "Dashboard"], ["/admin/users", "Users"], ["/admin/categories", "Categories"],
    ["/admin/classes", "Classes"], ["/admin/analytics", "Analytics"], ["/admin/attempts", "Attempts"],
  ],
};

export default function Sidebar() {
  const { user } = useAuth();
  const links = NAV[user?.role] || [];
  return (
    <aside className="w-56 shrink-0 bg-card border-r border-ink/15 min-h-screen p-3">
      <div className="text-xl font-semibold text-violet-dark px-2 py-3">Kuizzz</div>
      <nav className="space-y-1">
        {links.map(([to, label]) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/" || to === "/faculty" || to === "/admin"}
            className={({ isActive }) =>
              `block px-3 py-2 rounded-sm text-sm ${isActive ? "bg-violet text-white" : "text-ink/80 hover:bg-surface"}`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
