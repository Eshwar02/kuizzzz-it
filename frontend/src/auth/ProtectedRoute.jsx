import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";
import Spinner from "../components/ui/Spinner";

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen grid place-items-center"><Spinner size={28} /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
