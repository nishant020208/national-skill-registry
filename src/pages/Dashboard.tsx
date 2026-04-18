import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Dashboard = () => {
  const { profile, loading } = useAuth();
  if (loading) return null;
  if (!profile) return <Navigate to="/auth" replace />;
  if (profile.role === "iti_admin") return <Navigate to="/admin" replace />;
  if (profile.role === "principal") return <Navigate to="/principal" replace />;
  if (profile.role === "student") return <Navigate to="/student" replace />;
  return <Navigate to="/trainer" replace />;
};
export default Dashboard;
