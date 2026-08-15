import { useLayoutEffect, useRef, useState } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
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
  const navRef = useRef(null);
  const location = useLocation();
  // Position/size of the sliding highlight, measured from the active nav item.
  const [pill, setPill] = useState({ top: 0, height: 0, ready: false });

  useLayoutEffect(() => {
    const measure = () => {
      const el = navRef.current?.querySelector('[aria-current="page"]');
      if (el) setPill({ top: el.offsetTop, height: el.offsetHeight, ready: true });
      else setPill((p) => ({ ...p, ready: false }));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [location.pathname, user?.role]);

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
      <nav ref={navRef} className="relative space-y-2">
        {/* Sliding highlight that eases to the active item. */}
        <span
          aria-hidden
          className="absolute left-0 right-0 rounded-md bg-violet shadow-[0_4px_12px_rgba(43,39,64,0.18)] transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] z-0"
          style={{ top: 0, height: pill.height, transform: `translateY(${pill.top}px)`, opacity: pill.ready ? 1 : 0 }}
        />
        {links.map(([to, label, Icon]) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/" || to === "/faculty" || to === "/admin"}
            className={({ isActive }) =>
              `relative z-10 flex items-center gap-3 px-3.5 py-2.5 rounded-md text-sm transition-colors duration-700 ${
                isActive
                  ? "text-white"
                  : "text-ink/80 hover:bg-violet/5 hover:text-violet-dark hover:shadow-[0_2px_8px_rgba(43,39,64,0.10)]"
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
