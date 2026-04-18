import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, ShieldX, ExternalLink, TrendingUp, CheckCircle2, XCircle, Inbox, Award, BadgeCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { levelColor, levelLabel, statusBadgeClass, statusLabel } from "@/lib/credify";
import { EmptyState } from "@/components/EmptyState";
import { Leaderboard } from "@/components/Leaderboard";

type Cred = { id: string; level: number; status: string; hash: string; created_at: string; student_id: string; students: { name: string } | null; skills: { name: string } | null };
type Reass = { id: string; reason: string; status: string; created_at: string; student_id: string; students: { name: string } | null };

const PrincipalDashboard = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [creds, setCreds] = useState<Cred[]>([]);
  const [reass, setReass] = useState<Reass[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = async () => {
    if (!profile?.institution_id) { setLoading(false); return; }
    setLoading(true);
    const [c, r] = await Promise.all([
      supabase.from("credentials")
        .select("id,level,status,hash,created_at,student_id,students(name),skills(name)")
        .eq("institution_id", profile.institution_id).order("created_at", { ascending: false }).limit(500),
      supabase.from("reassessment_requests")
        .select("id,reason,status,created_at,student_id,students(name)")
        .eq("institution_id", profile.institution_id).order("created_at", { ascending: false }),
    ]);
    setCreds((c.data ?? []) as Cred[]);
    setReass((r.data ?? []) as Reass[]);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [profile?.institution_id]);

  const approveCred = async (c: Cred) => {
    if (!user) return;
    const ts = new Date().toISOString();
    const { error } = await supabase.from("credentials").update({
      status: "valid", principal_approved_by: user.id, principal_approved_at: ts,
    }).eq("id", c.id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    await supabase.from("credential_logs").insert({ credential_id: c.id, action: "principal_approved", performed_by: user.id });
    await supabase.from("credential_requests").update({ status: "approved", principal_id: user.id, principal_action_at: ts }).eq("credential_id", c.id);
    toast({ title: "Credential VERIFIED", description: `${c.students?.name} · ${c.skills?.name}` });
    load();
  };

  const rejectCred = async (c: Cred, reason: string) => {
    if (!user) return;
    const ts = new Date().toISOString();
    const { error } = await supabase.from("credentials").update({
      status: "rejected", rejected_by: user.id, rejected_at: ts, rejection_reason: reason,
    }).eq("id", c.id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    await supabase.from("credential_logs").insert({ credential_id: c.id, action: "principal_rejected", performed_by: user.id });
    await supabase.from("credential_requests").update({ status: "rejected", principal_id: user.id, principal_action_at: ts, rejection_reason: reason }).eq("credential_id", c.id);
    toast({ title: "Credential rejected" });
    setRejectingId(null); setRejectReason("");
    load();
  };

  const revoke = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from("credentials").update({ status: "revoked" }).eq("id", id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    await supabase.from("credential_logs").insert({ credential_id: id, action: "revoked", performed_by: user.id });
    toast({ title: "Revoked" }); load();
  };

  const updateReass = async (id: string, status: string) => {
    const { error } = await supabase.from("reassessment_requests").update({ status }).eq("id", id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: `Marked ${status}` }); load();
  };

  const pending = creds.filter(c => c.status === "pending_principal");
  const approved = creds.filter(c => c.status === "valid");
  const rejected = creds.filter(c => c.status === "rejected" || c.status === "revoked");
  const pendingReass = reass.filter(r => r.status === "pending");
  const trustScore = creds.length === 0 ? 100 : Math.round((approved.length / creds.length) * 100);

  return (
    <AppShell>
      <div className="mb-6">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-1">Principal Console</div>
        <h1 className="text-3xl font-bold tracking-tight">Hello {profile?.name?.split(" ")[0] ?? "Principal"} — your institution at a glance</h1>
        <p className="text-sm text-muted-foreground mt-1">Final approval gate. Every credential you sign carries your institution's name into the public registry.</p>
      </div>

      <div className="grid sm:grid-cols-4 gap-3 mb-6">
        <Stat icon={Inbox} label="Awaiting your approval" value={pending.length} highlight={pending.length > 0} />
        <Stat icon={BadgeCheck} label="Verified" value={approved.length} />
        <Stat icon={ShieldX} label="Rejected / Revoked" value={rejected.length} />
        <Stat icon={TrendingUp} label="Trust score" value={trustScore} suffix="%" success />
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="pending">Pending Approvals ({pending.length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({rejected.length})</TabsTrigger>
          <TabsTrigger value="reass">Re-assessment ({pendingReass.length})</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            {loading ? <div className="p-5 space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-16" />)}</div>
              : pending.length === 0
                ? <EmptyState icon={Inbox} title="All caught up" hint="No credentials awaiting your approval." />
                : <div className="divide-y divide-border">
                    {pending.map(c => (
                      <div key={c.id} className="p-4 space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <div className="font-semibold">{c.students?.name} <span className="text-muted-foreground font-normal">· {c.skills?.name}</span></div>
                            <div className="text-xs text-muted-foreground font-mono mt-1">{c.hash.slice(0, 24)}…</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={levelColor(c.level)}>L{c.level} · {levelLabel(c.level)}</Badge>
                            <Badge className={statusBadgeClass(c.status)}>{statusLabel(c.status)}</Badge>
                          </div>
                        </div>
                        {rejectingId === c.id ? (
                          <div className="space-y-2">
                            <Textarea placeholder="Reason for rejection" value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => { setRejectingId(null); setRejectReason(""); }}>Cancel</Button>
                              <Button size="sm" variant="destructive" disabled={!rejectReason.trim()} onClick={() => rejectCred(c, rejectReason.trim())}>Confirm reject</Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <Button size="sm" className="flex-1" onClick={() => approveCred(c)}><CheckCircle2 className="size-4 mr-1" />Approve & seal</Button>
                            <Button size="sm" variant="outline" className="flex-1 text-destructive border-destructive/40" onClick={() => setRejectingId(c.id)}><XCircle className="size-4 mr-1" />Reject</Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>}
          </div>
        </TabsContent>

        <TabsContent value="approved">
          <CredList creds={approved} loading={loading} onRevoke={revoke} emptyTitle="No verified credentials yet" emptyHint="Approve pending requests to grow this list." canRevoke />
        </TabsContent>

        <TabsContent value="rejected">
          <CredList creds={rejected} loading={loading} emptyTitle="Nothing rejected" emptyHint="Rejected and revoked credentials will appear here." />
        </TabsContent>

        <TabsContent value="reass">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            {pendingReass.length === 0
              ? <EmptyState icon={BadgeCheck} title="No re-assessment requests" hint="Students can request a re-assessment from their dashboard." />
              : <div className="divide-y divide-border">
                  {pendingReass.map(r => (
                    <div key={r.id} className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold">{r.students?.name}</div>
                          <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
                        </div>
                        <Badge variant="outline">Pending</Badge>
                      </div>
                      <div className="text-sm p-3 rounded bg-surface-1 border border-border italic text-muted-foreground">"{r.reason}"</div>
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1" onClick={() => updateReass(r.id, "approved")}>Approve</Button>
                        <Button size="sm" variant="outline" className="flex-1 text-destructive border-destructive/40" onClick={() => updateReass(r.id, "rejected")}>Reject</Button>
                      </div>
                    </div>
                  ))}
                </div>}
          </div>
        </TabsContent>

        <TabsContent value="leaderboard">
          <Leaderboard institutionId={profile?.institution_id} />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
};

const Stat = ({ icon: Icon, label, value, highlight, suffix, success }: { icon: any; label: string; value: number; highlight?: boolean; suffix?: string; success?: boolean }) => (
  <div className={`bg-card border rounded-lg p-4 ${highlight ? "border-warning/40" : success ? "border-success/30" : "border-border"}`}>
    <div className="flex items-center justify-between mb-1.5">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <Icon className={`size-4 ${highlight ? "text-warning" : success ? "text-success" : "text-muted-foreground"}`} />
    </div>
    <div className={`text-2xl font-bold ${success ? "text-success" : ""}`}>{value}{suffix}</div>
  </div>
);

const CredList = ({ creds, loading, onRevoke, canRevoke, emptyTitle, emptyHint }: { creds: Cred[]; loading: boolean; onRevoke?: (id: string) => void; canRevoke?: boolean; emptyTitle: string; emptyHint: string }) => (
  <div className="bg-card border border-border rounded-lg overflow-hidden">
    {loading ? <div className="p-5 space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-14" />)}</div>
      : creds.length === 0 ? <EmptyState icon={Award} title={emptyTitle} hint={emptyHint} />
      : <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
          {creds.map(c => (
            <div key={c.id} className="p-4 flex items-center justify-between">
              <div>
                <div className="font-semibold">{c.students?.name} <span className="text-muted-foreground font-normal">· {c.skills?.name}</span></div>
                <div className="text-xs text-muted-foreground font-mono mt-0.5">{c.hash.slice(0, 24)}…</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={levelColor(c.level)}>L{c.level}</Badge>
                <Badge className={statusBadgeClass(c.status)}>{statusLabel(c.status)}</Badge>
                <Button asChild size="icon" variant="ghost"><Link to={`/verify/${c.student_id}`}><ExternalLink className="size-4" /></Link></Button>
                {canRevoke && c.status === "valid" && onRevoke && <Button size="sm" variant="outline" className="text-destructive border-destructive/40" onClick={() => onRevoke(c.id)}>Revoke</Button>}
              </div>
            </div>
          ))}
        </div>}
  </div>
);

export default PrincipalDashboard;
