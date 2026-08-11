import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { Badge, Button } from "../ui";

const roleTone = { ADMIN: "red", FACULTY: "violet", STUDENT: "green" };

export default function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const onLogout = () => { logout(); navigate("/login", { replace: true }); };
  return (
    <header className="h-14 bg-card border-b border-ink/15 flex items-center justify-end gap-3 px-4">
      <span className="text-sm text-ink/70">{user?.name}</span>
      <Badge tone={roleTone[user?.role]}>{user?.role}</Badge>
      <Button variant="secondary" size="sm" onClick={onLogout}>Log out</Button>
    </header>
  );
}
