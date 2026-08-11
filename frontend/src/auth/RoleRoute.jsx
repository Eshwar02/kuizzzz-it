import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";
import Spinner from "../components/ui/Spinner";

export default function RoleRoute({ roles }) {
  const { user, loading, roleHome } = useAuth();
  if (loading) return <div className="min-h-screen grid place-items-center"><Spinner size={28} /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to={roleHome()} replace />;
  return <Outlet />;
}
