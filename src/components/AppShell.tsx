import { ReactNode, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ShieldCheck, LogOut, LayoutDashboard, IdCard, Award, Trophy, Search, Inbox, ArrowLeft, Menu, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type NavItem = { to: string; label: string; icon?: any };

const sidebarFor = (role?: string): NavItem[] => {
  if (role === "iti_admin") return [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { to: "/passport", label: "Skill Passport", icon: IdCard },
    { to: "/search", label: "Employer Search", icon: Search },
    { to: "/admin?tab=settings", label: "Settings", icon: Settings },
  ];
  if (role === "principal") return [
    { to: "/principal", label: "Dashboard", icon: LayoutDashboard },
    { to: "/principal?tab=pending", label: "Approvals", icon: Inbox },
    { to: "/passport", label: "Skill Passport", icon: IdCard },
    { to: "/search", label: "Employer Search", icon: Search },
    { to: "/principal?tab=settings", label: "Settings", icon: Settings },
  ];
  if (role === "trainer") return [
    { to: "/trainer", label: "Dashboard", icon: LayoutDashboard },
    { to: "/trainer?tab=requests", label: "Requests", icon: Inbox },
    { to: "/passport", label: "Skill Passport", icon: IdCard },
    { to: "/trainer?tab=settings", label: "Settings", icon: Settings },
  ];
  if (role === "student") return [
    { to: "/student", label: "Dashboard", icon: LayoutDashboard },
    { to: "/student?tab=skills", label: "My Skills", icon: Award },
    { to: "/student?tab=certificates", label: "Certificates", icon: IdCard },
    { to: "/student?tab=rank", label: "Rank", icon: Trophy },
    { to: "/student?tab=settings", label: "Settings", icon: Settings },
  ];
  return [];
};

export const AppShell = ({ children }: { children: ReactNode; nav?: NavItem[] }) => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [openNav, setOpenNav] = useState(false);

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

  const NavList = ({ onClick }: { onClick?: () => void }) => (
    <nav className="bg-card border border-border rounded-lg p-2 sticky top-6">
      {items.map(it => {
        const Icon = it.icon;
        const active = isActive(it.to);
        return (
          <button
            key={it.to}
            onClick={() => { navigate(it.to); onClick?.(); }}
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
  );

  return (
    <div className="min-h-screen bg-surface-1">
      <div className="gov-strip" />
      <header className="border-b border-border bg-card">
        <div className="container flex items-center justify-between h-16 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {items.length > 0 && (
              <Sheet open={openNav} onOpenChange={setOpenNav}>
                <SheetTrigger asChild>
                  <Button size="icon" variant="ghost" className="lg:hidden" aria-label="Open menu">
                    <Menu className="size-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-4">
                  <SheetHeader className="mb-4">
                    <SheetTitle className="text-left">Menu</SheetTitle>
                  </SheetHeader>
                  <NavList onClick={() => setOpenNav(false)} />
                </SheetContent>
              </Sheet>
            )}
            <Button size="icon" variant="ghost" onClick={() => navigate(-1)} aria-label="Go back" title="Go back">
              <ArrowLeft className="size-4" />
            </Button>
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-9 sm:size-10 shrink-0">
                <img src="/logo.png" alt="National Skill Registry Logo" className="w-full h-full object-contain" />
              </div>
              <div className="leading-tight min-w-0 hidden xs:block sm:block">
                <div className="font-bold tracking-tight text-sm sm:text-base truncate">NATIONAL SKILL REGISTRY</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground hidden md:block">
                  Ministry of Skill Development &amp; Entrepreneurship · Government of India
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {profile ? (
              <>
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-semibold truncate max-w-[160px]">{profile.name}</div>
                  <div className="text-[10px] uppercase tracking-wider text-primary font-semibold">{roleLabel}</div>
                </div>
                <Button size="icon" variant="ghost" onClick={async () => { await signOut(); navigate("/"); }} aria-label="Sign out">
                  <LogOut className="size-4" />
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => navigate("/auth")}>Sign in</Button>
            )}
          </div>
        </div>
      </header>

      <div className="container py-4 sm:py-6">
        <div className={items.length ? "grid lg:grid-cols-[220px_1fr] gap-6" : ""}>
          {items.length > 0 && (
            <aside className="hidden lg:block">
              <NavList />
            </aside>
          )}
          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
};
