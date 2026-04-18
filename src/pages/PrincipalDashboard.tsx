import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, ShieldX, ExternalLink, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { levelColor, levelLabel } from "@/lib/credify";

type Cred = { id: string; level: number; status: string; hash: string; student_id: string; students: { name: string } | null; skills: { name: string } | null };

const PrincipalDashboard = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [creds, setCreds] = useState<Cred[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!profile?.institution_id) return;
    setLoading(true);
    const { data } = await supabase.from("credentials")
      .select("id,level,status,hash,student_id,students(name),skills(name)")
      .eq("institution_id", profile.institution_id).order("created_at", { ascending: false });
    setCreds((data ?? []) as Cred[]); setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [profile?.institution_id]);

  const revoke = async (id: string) => {
    const { error } = await supabase.from("credentials").update({ status: "revoked" }).eq("id", id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    if (user) await supabase.from("credential_logs").insert({ credential_id: id, action: "revoked", performed_by: user.id });
    toast({ title: "Revoked" }); load();
  };

  const valid = creds.filter(c => c.status === "valid").length;
  const revoked = creds.length - valid;
  const trustScore = creds.length === 0 ? 100 : Math.round((valid / creds.length) * 100);

  return (
    <AppShell nav={[{ to: "/principal", label: "Credentials" }]}>
      <div className="mb-8">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-1">Principal Console</div>
        <h1 className="text-3xl font-bold tracking-tight">Institution oversight</h1>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-2"><span className="text-xs uppercase tracking-wider text-muted-foreground">Total credentials</span><Building2 className="size-4 text-muted-foreground" /></div>
          <div className="text-3xl font-bold">{creds.length}</div>
        </div>
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-2"><span className="text-xs uppercase tracking-wider text-muted-foreground">Valid · Revoked</span><ShieldX className="size-4 text-muted-foreground" /></div>
          <div className="text-3xl font-bold"><span className="text-success">{valid}</span><span className="text-muted-foreground"> · </span><span className="text-destructive">{revoked}</span></div>
        </div>
        <div className="glass-card p-6 border-success/30">
          <div className="flex items-center justify-between mb-2"><span className="text-xs uppercase tracking-wider text-muted-foreground">Trust score</span><TrendingUp className="size-4 text-success" /></div>
          <div className="text-3xl font-bold text-success">{trustScore}%</div>
          <div className="mt-3 h-1.5 rounded-full bg-surface-3 overflow-hidden"><div className="h-full bg-gradient-to-r from-success to-primary-glow" style={{ width: `${trustScore}%` }} /></div>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-5 border-b border-border/60 font-semibold">All credentials</div>
        {loading ? <div className="p-5 space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-14" />)}</div> :
          creds.length === 0 ? <div className="p-12 text-center text-muted-foreground">No credentials yet.</div> :
          <div className="divide-y divide-border/60">
            {creds.map(c => (
              <div key={c.id} className="p-5 flex items-center justify-between">
                <div>
                  <div className="font-medium">{c.students?.name} <span className="text-muted-foreground">· {c.skills?.name}</span></div>
                  <div className="text-xs text-muted-foreground font-mono mt-0.5">{c.hash.slice(0, 24)}…</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={levelColor(c.level)}>L{c.level} {levelLabel(c.level)}</Badge>
                  {c.status === "valid" ? <Badge className="verify-badge">Valid</Badge> : <Badge variant="destructive">Revoked</Badge>}
                  <Button asChild size="icon" variant="ghost"><Link to={`/verify/${c.student_id}`}><ExternalLink className="size-4" /></Link></Button>
                  {c.status === "valid" && <Button size="sm" variant="destructive" onClick={() => revoke(c.id)}>Revoke</Button>}
                </div>
              </div>
            ))}
          </div>
        }
      </div>
    </AppShell>
  );
};

export default PrincipalDashboard;
