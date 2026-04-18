import { useEffect, useMemo, useState } from "react";
import { Building2, UserPlus, Users, Award, AlertTriangle, TrendingUp } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

type Inst = { id: string; name: string; location: string | null };
type WL = { id: string; email: string; role: string; institution_id: string | null; is_used: boolean };
type CredRow = { id: string; status: string; institution_id: string; issued_by: string | null; created_at: string; skills: { name: string } | null };

const AdminDashboard = () => {
  const { toast } = useToast();
  const [insts, setInsts] = useState<Inst[]>([]);
  const [wl, setWl] = useState<WL[]>([]);
  const [creds, setCreds] = useState<CredRow[]>([]);
  const [studentCount, setStudentCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [iName, setIName] = useState(""); const [iLoc, setILoc] = useState("");
  const [wEmail, setWEmail] = useState(""); const [wRole, setWRole] = useState("trainer"); const [wInst, setWInst] = useState("");
  const [openInst, setOpenInst] = useState(false); const [openWL, setOpenWL] = useState(false);

  const load = async () => {
    setLoading(true);
    const [i, w, c, s] = await Promise.all([
      supabase.from("institutions").select("*").order("created_at", { ascending: false }),
      supabase.from("whitelist").select("*").order("created_at", { ascending: false }),
      supabase.from("credentials").select("id,status,institution_id,issued_by,created_at,skills(name)").order("created_at", { ascending: false }).limit(2000),
      supabase.from("students").select("id", { count: "exact", head: true }),
    ]);
    setInsts((i.data ?? []) as Inst[]);
    setWl((w.data ?? []) as WL[]);
    setCreds((c.data ?? []) as CredRow[]);
    setStudentCount(s.count ?? 0);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const valid = creds.filter(c => c.status === "valid").length;
  const revoked = creds.length - valid;

  const topSkills = useMemo(() => {
    const m = new Map<string, number>();
    creds.forEach(c => { const n = c.skills?.name ?? "—"; m.set(n, (m.get(n) ?? 0) + 1); });
    return [...m.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name,count])=>({name: name.length>22?name.slice(0,20)+"…":name, count}));
  }, [creds]);

  const topInstitutions = useMemo(() => {
    const m = new Map<string, { v: number; r: number }>();
    creds.forEach(c => {
      const cur = m.get(c.institution_id) ?? { v: 0, r: 0 };
      if (c.status === "valid") cur.v++; else cur.r++;
      m.set(c.institution_id, cur);
    });
    return [...m.entries()].map(([id, x]) => {
      const inst = insts.find(i => i.id === id);
      const total = x.v + x.r;
      return { id, name: inst?.name ?? "—", total, score: total === 0 ? 100 : Math.round((x.v / total) * 100) };
    }).filter(x => x.total >= 5).sort((a,b)=>b.score-a.score || b.total-a.total).slice(0,5);
  }, [creds, insts]);

  // Fraud: trainer with >50 credentials in last 24h
  const fraudFlags = useMemo(() => {
    const since = Date.now() - 24*60*60*1000;
    const m = new Map<string, number>();
    creds.forEach(c => {
      if (!c.issued_by) return;
      if (new Date(c.created_at).getTime() < since) return;
      m.set(c.issued_by, (m.get(c.issued_by) ?? 0) + 1);
    });
    return [...m.entries()].filter(([,n]) => n > 50).map(([id, n]) => ({ id, count: n }));
  }, [creds]);

  const addInst = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("institutions").insert({ name: iName, location: iLoc });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Institution added" }); setIName(""); setILoc(""); setOpenInst(false); load();
  };
  const addWL = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("whitelist").insert({ email: wEmail.toLowerCase(), role: wRole as any, institution_id: wInst || null });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Email whitelisted" }); setWEmail(""); setWInst(""); setOpenWL(false); load();
  };

  const COLORS = ["hsl(var(--success))", "hsl(var(--destructive))"];
  const donut = [{ name: "Valid", value: valid }, { name: "Revoked", value: revoked }];

  return (
    <AppShell nav={[{ to: "/admin", label: "Overview" }]}>
      <div className="mb-8">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-1">ITI Admin Console</div>
        <h1 className="text-3xl font-bold tracking-tight">National oversight</h1>
      </div>

      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <Stat icon={Building2} label="Institutions" value={insts.length} />
        <Stat icon={Users} label="Students" value={studentCount} />
        <Stat icon={Award} label="Credentials" value={creds.length} />
        <Stat icon={UserPlus} label="Whitelisted" value={wl.length} />
      </div>

      {/* Fraud flags */}
      {fraudFlags.length > 0 && (
        <div className="glass-card p-5 mb-6 border-warning/40 bg-warning/5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="size-5 text-warning" />
            <h3 className="font-semibold">Suspicious Activity Detected</h3>
            <Badge variant="outline" className="ml-2 border-warning/40 text-warning">{fraudFlags.length} trainer(s)</Badge>
          </div>
          <div className="space-y-2">
            {fraudFlags.map(f => (
              <div key={f.id} className="flex items-center justify-between text-sm py-1.5">
                <span className="font-mono text-muted-foreground">Trainer #{f.id.slice(0,8)}</span>
                <span className="text-warning font-semibold">{f.count} credentials in 24h</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4"><h3 className="font-semibold">Credential status</h3><span className="text-xs text-muted-foreground">{creds.length} total</span></div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donut} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={2}>
                  {donut.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-around text-sm pt-2 border-t border-border/60">
            <div><span className="inline-block size-2 rounded-full bg-success mr-2" />Valid <span className="text-muted-foreground ml-1">{valid}</span></div>
            <div><span className="inline-block size-2 rounded-full bg-destructive mr-2" />Revoked <span className="text-muted-foreground ml-1">{revoked}</span></div>
          </div>
        </div>

        <div className="glass-card p-5">
          <h3 className="font-semibold mb-4">Top 5 skills issued</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topSkills} layout="vertical" margin={{ left: 0, right: 16 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6 }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top institutions by trust score */}
      <div className="glass-card p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2"><TrendingUp className="size-4 text-success" />Top institutions by Trust Score</h3>
          <span className="text-xs text-muted-foreground">min 5 credentials</span>
        </div>
        {topInstitutions.length === 0 ? <div className="text-sm text-muted-foreground py-2">Not enough data yet.</div> :
          <div className="space-y-2">
            {topInstitutions.map((t, idx) => (
              <div key={t.id} className="flex items-center gap-3">
                <div className="text-xs text-muted-foreground w-5">#{idx+1}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="truncate font-medium">{t.name}</span>
                    <span className="text-success font-semibold ml-2">{t.score}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-success to-primary-glow" style={{ width: `${t.score}%` }} />
                  </div>
                </div>
                <span className="text-xs text-muted-foreground w-16 text-right">{t.total} creds</span>
              </div>
            ))}
          </div>
        }
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-card overflow-hidden">
          <div className="p-5 border-b border-border/60 flex items-center justify-between">
            <h2 className="font-semibold">Institutions</h2>
            <Dialog open={openInst} onOpenChange={setOpenInst}>
              <DialogTrigger asChild><Button size="sm">Add</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add institution</DialogTitle></DialogHeader>
                <form onSubmit={addInst} className="space-y-4">
                  <div><Label>Name</Label><Input required value={iName} onChange={e => setIName(e.target.value)} /></div>
                  <div><Label>Location</Label><Input value={iLoc} onChange={e => setILoc(e.target.value)} /></div>
                  <Button className="w-full">Add</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          {loading ? <div className="p-5 space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-12" />)}</div> :
            <div className="divide-y divide-border/60 max-h-96 overflow-y-auto">
              {insts.map(i => (
                <div key={i.id} className="p-4">
                  <div className="font-medium">{i.name}</div>
                  <div className="text-xs text-muted-foreground">{i.location ?? "—"}</div>
                </div>
              ))}
            </div>}
        </div>

        <div className="glass-card overflow-hidden">
          <div className="p-5 border-b border-border/60 flex items-center justify-between">
            <h2 className="font-semibold">Whitelist</h2>
            <Dialog open={openWL} onOpenChange={setOpenWL}>
              <DialogTrigger asChild><Button size="sm">Add email</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Whitelist email</DialogTitle></DialogHeader>
                <form onSubmit={addWL} className="space-y-4">
                  <div><Label>Email</Label><Input type="email" required value={wEmail} onChange={e => setWEmail(e.target.value)} /></div>
                  <div><Label>Role</Label>
                    <Select value={wRole} onValueChange={setWRole}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="trainer">Trainer</SelectItem>
                        <SelectItem value="principal">Principal</SelectItem>
                        <SelectItem value="iti_admin">ITI Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {wRole !== "iti_admin" && (
                    <div><Label>Institution</Label>
                      <Select value={wInst} onValueChange={setWInst}>
                        <SelectTrigger><SelectValue placeholder="Select institution" /></SelectTrigger>
                        <SelectContent>{insts.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  )}
                  <Button className="w-full">Add</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          {loading ? <div className="p-5 space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-12" />)}</div> :
            <div className="divide-y divide-border/60 max-h-96 overflow-y-auto">
              {wl.map(w => (
                <div key={w.id} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-mono text-sm">{w.email}</div>
                    <div className="text-xs text-muted-foreground capitalize">{w.role.replace("_", " ")}</div>
                  </div>
                  {w.is_used ? <Badge variant="outline" className="text-muted-foreground">Used</Badge> : <Badge className="verify-badge">Pending</Badge>}
                </div>
              ))}
            </div>}
        </div>
      </div>
    </AppShell>
  );
};

const Stat = ({ icon: Icon, label, value }: { icon: any; label: string; value: number }) => (
  <div className="glass-card p-5">
    <div className="flex items-center justify-between mb-2"><span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span><Icon className="size-4 text-muted-foreground" /></div>
    <div className="text-3xl font-bold">{value}</div>
  </div>
);

export default AdminDashboard;
