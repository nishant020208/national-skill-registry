import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ShieldCheck, LogOut, LayoutDashboard, IdCard, Award, Trophy, Search, Inbox, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/SiteFooter";

type NavItem = { to: string; label: string; icon?: any };

const sidebarFor = (role?: string): NavItem[] => {
  if (role === "iti_admin") return [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { to: "/passport", label: "Skill Passport", icon: IdCard },
    { to: "/principal", label: "Approvals", icon: Inbox },
    { to: "/trainer", label: "Trainer view", icon: Award },
    { to: "/search", label: "Employer Search", icon: Search },
  ];
  if (role === "principal") return [
    { to: "/principal", label: "Dashboard", icon: LayoutDashboard },
    { to: "/principal?tab=pending", label: "Approvals", icon: Inbox },
    { to: "/passport", label: "Skill Passport", icon: IdCard },
    { to: "/search", label: "Employer Search", icon: Search },
  ];
  if (role === "trainer") return [
    { to: "/trainer", label: "Dashboard", icon: LayoutDashboard },
    { to: "/trainer?tab=requests", label: "Requests", icon: Inbox },
    { to: "/passport", label: "Skill Passport", icon: IdCard },
  ];
  if (role === "student") return [
    { to: "/student", label: "Dashboard", icon: LayoutDashboard },
    { to: "/student?tab=skills", label: "My Skills", icon: Award },
    { to: "/student?tab=certificates", label: "Certificates", icon: IdCard },
    { to: "/student?tab=rank", label: "Rank", icon: Trophy },
  ];
  return [];
};

export const AppShell = ({ children }: { children: ReactNode; nav?: NavItem[] }) => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const roleLabel =
    profile?.role === "iti_admin" ? "ITI Admin" :
    profile?.role === "principal" ? "Principal" :
    profile?.role === "trainer" ? "Trainer" :
    profile?.role === "student" ? "Student" : "";

  const items = sidebarFor(profile?.role);
  const isActive = (to: string) => {
    const [path] = to.split("?");
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-surface-1">
      <div className="gov-strip" />
      <header className="border-b border-border bg-card">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Button size="icon" variant="ghost" onClick={() => navigate(-1)} aria-label="Go back" title="Go back">
              <ArrowLeft className="size-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-md bg-primary grid place-items-center">
                <ShieldCheck className="size-5 text-primary-foreground" />
              </div>
              <div className="leading-tight">
                <div className="font-bold tracking-tight text-base">NATIONAL SKILL REGISTRY</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Ministry of Skill Development &amp; Entrepreneurship · Government of India
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {profile ? (
              <>
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-semibold">{profile.name}</div>
                  <div className="text-[10px] uppercase tracking-wider text-primary font-semibold">{roleLabel}</div>
                </div>
                <Button size="icon" variant="ghost" onClick={async () => { await signOut(); navigate("/"); }}>
                  <LogOut className="size-4" />
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => navigate("/auth")}>Sign in</Button>
            )}
          </div>
        </div>
      </header>

      <div className="container py-6">
        <div className={items.length ? "grid lg:grid-cols-[220px_1fr] gap-6" : ""}>
          {items.length > 0 && (
            <aside className="hidden lg:block">
              <nav className="bg-card border border-border rounded-lg p-2 sticky top-6">
                {items.map(it => {
                  const Icon = it.icon;
                  const active = isActive(it.to);
                  return (
                    <button
                      key={it.to}
                      onClick={() => navigate(it.to)}
                      className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition mb-0.5 ${
                        active ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-surface-1 hover:text-foreground"
                      }`}
                    >
                      {Icon && <Icon className="size-4" />}
                      {it.label}
                    </button>
                  );
                })}
              </nav>
            </aside>
          )}
          <main className="min-w-0">{children}</main>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
};
