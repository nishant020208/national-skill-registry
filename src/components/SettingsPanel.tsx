import { Link } from "react-router-dom";
import { ShieldCheck, LogOut, User, Building2, Mail, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export const SettingsPanel = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const roleLabel =
    profile?.role === "iti_admin" ? "ITI Admin" :
    profile?.role === "principal" ? "Principal" :
    profile?.role === "trainer" ? "Trainer" :
    profile?.role === "student" ? "Student" : "—";

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><User className="size-4" /> Account</h3>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <Field label="Name" value={profile?.name ?? "—"} />
          <Field label="Email" value={profile?.email ?? "—"} icon={Mail} />
          <Field label="Role" value={roleLabel} icon={BadgeCheck} />
          <Field label="Institution ID" value={profile?.institution_id?.slice(0, 8) + "…" || "—"} icon={Building2} />
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => { await signOut(); navigate("/"); }}
          >
            <LogOut className="size-4 mr-1.5" /> Sign out
          </Button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-md bg-primary grid place-items-center shrink-0">
            <ShieldCheck className="size-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm">Powered by NATIONAL SKILL REGISTRY</div>
            <div className="text-xs text-muted-foreground mt-0.5">A Government Skill Initiative · Ministry of Skill Development &amp; Entrepreneurship</div>
            <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
              Credentials displayed on this portal are cryptographically sealed using SHA-256 and issued only by authorised
              ITI &amp; Polytechnic institutions. Verification is provided in good faith; employers are advised to corroborate
              with the issuing institution where required.
            </p>
            <div className="flex flex-wrap gap-4 mt-4 text-sm">
              <Link to="/about" className="text-primary hover:underline">About</Link>
              <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
              <Link to="/terms" className="text-primary hover:underline">Terms of Use</Link>
            </div>
            <div className="text-[11px] text-muted-foreground mt-4 font-mono">
              © {new Date().getFullYear()} NATIONAL SKILL REGISTRY · v1.0
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, value, icon: Icon }: { label: string; value: string; icon?: any }) => (
  <div>
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">{label}</div>
    <div className="flex items-center gap-1.5 text-foreground font-medium break-all">
      {Icon && <Icon className="size-3.5 text-muted-foreground shrink-0" />}
      <span>{value}</span>
    </div>
  </div>
);
