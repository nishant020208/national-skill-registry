import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth, AppRole } from "@/contexts/AuthContext";

export const ProtectedRoute = ({ children, roles }: { children: ReactNode; roles?: AppRole[] }) => {
  const { user, profile, loading } = useAuth();
  if (loading) return <div className="min-h-screen grid place-items-center"><div className="size-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (roles && profile && !roles.includes(profile.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};
