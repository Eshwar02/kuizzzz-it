import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function RoleRoute({ roles }) {
  const { user, roleHome } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to={roleHome()} replace />;
  return <Outlet />;
}
