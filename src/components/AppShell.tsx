import { ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { ShieldCheck, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

export const AppShell = ({ children, nav }: { children: ReactNode; nav?: { to: string; label: string }[] }) => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/60 backdrop-blur-md bg-background/70 sticky top-0 z-40">
        <div className="container flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="size-9 rounded-xl bg-gradient-primary grid place-items-center shadow-glow">
              <ShieldCheck className="size-5 text-primary-foreground" />
            </div>
            <div className="leading-tight">
              <div className="font-bold tracking-tight">Credify</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Verified Skills</div>
            </div>
          </Link>

          {nav && (
            <nav className="hidden md:flex items-center gap-1">
              {nav.map(n => (
                <NavLink key={n.to} to={n.to} end className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-sm font-medium transition ${isActive ? "bg-surface-2 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-surface-1"}`}>
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
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{profile.role.replace("_", " ")}</div>
                </div>
                <Button size="icon" variant="ghost" onClick={async () => { await signOut(); navigate("/"); }}>
                  <LogOut className="size-4" />
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={() => navigate("/auth")}>Sign in</Button>
            )}
          </div>
        </div>
      </header>
      <main className="container py-8 animate-fade-up">{children}</main>
    </div>
  );
};
