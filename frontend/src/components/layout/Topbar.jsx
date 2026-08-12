import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { assignmentsApi } from "../../api";
import { Avatar, Badge, Button } from "../ui";

const roleTone = { ADMIN: "red", FACULTY: "violet", STUDENT: "green" };

export default function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [todo, setTodo] = useState(0);

  useEffect(() => {
    if (user?.role === "STUDENT") {
      assignmentsApi.todo().then((t) => setTodo(t.length)).catch(() => {});
    }
  }, [user?.role]);

  const onLogout = () => { logout(); navigate("/login", { replace: true }); };
  return (
    <header className="h-14 bg-card border-b border-ink/15 shadow-sm flex items-center justify-end gap-3 px-4 shrink-0">
      {user?.role === "STUDENT" && todo > 0 && (
        <Link to="/" className="text-xs bg-violet text-white rounded-full px-2.5 py-1">{todo} to-do</Link>
      )}
      <Avatar name={user?.name} size={28} />
      <span className="text-sm text-ink/70">{user?.name}</span>
      <Badge tone={roleTone[user?.role]}>{user?.role}</Badge>
      <Button variant="secondary" size="sm" onClick={onLogout}>Log out</Button>
    </header>
  );
}
