import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Dashboard = () => {
  const { user, profile, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  // Signed in but profile still loading — wait instead of bouncing to /auth.
  if (!profile) return <div className="min-h-screen grid place-items-center"><div className="size-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" /></div>;
  if (profile.role === "iti_admin") return <Navigate to="/admin" replace />;
  if (profile.role === "principal") return <Navigate to="/principal" replace />;
  if (profile.role === "student") return <Navigate to="/student" replace />;
  return <Navigate to="/trainer" replace />;
};
export default Dashboard;
