import { ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { ShieldCheck, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/SiteFooter";

export const AppShell = ({ children, nav }: { children: ReactNode; nav?: { to: string; label: string }[] }) => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const roleLabel = profile?.role === "iti_admin" ? "ITI Admin" : profile?.role === "principal" ? "Principal" : profile?.role === "trainer" ? "Trainer" : "";

  return (
    <div className="min-h-screen bg-surface-1">
      <div className="gov-strip" />
      <header className="border-b border-border bg-card">
        <div className="container flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="size-9 rounded-md bg-primary grid place-items-center">
              <ShieldCheck className="size-5 text-primary-foreground" />
            </div>
            <div className="leading-tight">
              <div className="font-semibold tracking-tight text-base">Credify</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Govt. Skill Passport</div>
            </div>
          </Link>

          {nav && (
            <nav className="hidden md:flex items-center gap-1">
              {nav.map(n => (
                <NavLink key={n.to} to={n.to} end className={({ isActive }) =>
                  `px-3 py-1.5 rounded-md text-sm font-medium transition ${isActive ? "bg-primary/10 text-primary" : "text-foreground/70 hover:text-foreground hover:bg-surface-1"}`}>
                  {n.label}
                </NavLink>
              ))}
            </nav>
          )}

          <div className="flex items-center gap-3">
            {profile ? (
              <>
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-medium">{profile.name}</div>
                  <div className="text-[10px] uppercase tracking-wider text-primary font-semibold">{roleLabel}</div>
                </div>
                <Button size="icon" variant="ghost" onClick={async () => { await signOut(); navigate("/"); }}>
                  <LogOut className="size-4" />
                </Button>
              </>
            ) : (
              <Button size="sm" variant="default" onClick={() => navigate("/auth")}>Sign in</Button>
            )}
          </div>
        </div>
      </header>
      <main className="container py-8">{children}</main>
      <SiteFooter />
    </div>
  );
};
