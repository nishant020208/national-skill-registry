import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Building2, UserPlus, Users, Award, AlertTriangle, TrendingUp, Inbox, Settings as SettingsIcon } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { EmptyState } from "@/components/EmptyState";
import { SettingsPanel } from "@/components/SettingsPanel";

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
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "overview";

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
  const revoked = creds.filter(c => c.status === "revoked" || c.status === "rejected").length;
  const pending = creds.filter(c => c.status === "pending_trainer" || c.status === "pending_principal").length;

  const topSkills = useMemo(() => {
    const m = new Map<string, number>();
    creds.forEach(c => { const n = c.skills?.name ?? "—"; m.set(n, (m.get(n) ?? 0) + 1); });
    return [...m.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name,count])=>({name: name.length>22?name.slice(0,20)+"…":name, count}));
  }, [creds]);

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
    if (wRole !== "iti_admin" && !wInst) return toast({ title: "Select an institution", variant: "destructive" });
    const { error } = await supabase.from("whitelist").insert({
      email: wEmail.toLowerCase().trim(), role: wRole as any, institution_id: wInst || null,
    });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Email whitelisted", description: `${wEmail} can now register as ${wRole}.` });
    setWEmail(""); setWInst(""); setOpenWL(false); load();
  };

  const COLORS = ["hsl(var(--success))", "hsl(var(--destructive))", "hsl(var(--warning))"];
  const donut = [{ name: "Valid", value: valid }, { name: "Revoked", value: revoked }, { name: "Pending", value: pending }];

  return (
    <AppShell>
      <div className="mb-6">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-1">ITI Admin Console</div>
        <h1 className="text-3xl font-bold tracking-tight">National oversight</h1>
        <p className="text-sm text-muted-foreground mt-1">Onboard institutions, whitelist users, and watch the registry's health.</p>
      </div>

      <div className="grid sm:grid-cols-4 gap-3 mb-6">
        <Stat icon={Building2} label="Institutions" value={insts.length} />
        <Stat icon={Users} label="Students" value={studentCount} />
        <Stat icon={Award} label="Credentials" value={creds.length} />
        <Stat icon={UserPlus} label="Whitelisted" value={wl.length} />
      </div>

      {fraudFlags.length > 0 && (
        <div className="bg-card border border-warning/40 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="size-5 text-warning" />
            <h3 className="font-semibold">Suspicious Activity</h3>
            <Badge variant="outline" className="border-warning/40 text-warning">{fraudFlags.length} trainer(s)</Badge>
          </div>
          <div className="space-y-1.5">
            {fraudFlags.map(f => (
              <div key={f.id} className="flex items-center justify-between text-sm">
                <span className="font-mono text-muted-foreground">Trainer #{f.id.slice(0,8)}</span>
                <span className="text-warning font-semibold">{f.count} credentials in 24h</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => setParams({ tab: v })} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="whitelist">Whitelist ({wl.length})</TabsTrigger>
          <TabsTrigger value="institutions">Institutions ({insts.length})</TabsTrigger>
          <TabsTrigger value="settings"><SettingsIcon className="size-3.5 mr-1" />Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-lg p-5">
              <div className="flex items-center justify-between mb-3"><h3 className="font-semibold">Credential status</h3><span className="text-xs text-muted-foreground">{creds.length} total</span></div>
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
              <div className="flex justify-around text-sm pt-2 border-t border-border">
                <div><span className="inline-block size-2 rounded-full bg-success mr-1.5" />Valid {valid}</div>
                <div><span className="inline-block size-2 rounded-full bg-destructive mr-1.5" />Revoked {revoked}</div>
                <div><span className="inline-block size-2 rounded-full bg-warning mr-1.5" />Pending {pending}</div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-5">
              <h3 className="font-semibold mb-3">Top 5 skills issued</h3>
              <div className="h-56">
                {topSkills.length === 0 ? <EmptyState icon={Award} title="No skill data yet" /> :
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topSkills} layout="vertical" margin={{ left: 0, right: 16 }}>
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6 }} />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0,4,4,0]} />
                    </BarChart>
                  </ResponsiveContainer>}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="whitelist">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold">Authorised emails</h2>
              <Dialog open={openWL} onOpenChange={setOpenWL}>
                <DialogTrigger asChild><Button size="sm"><UserPlus className="size-4 mr-1" />Add user</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Whitelist a user</DialogTitle></DialogHeader>
                  <form onSubmit={addWL} className="space-y-4">
                    <div><Label>Email</Label><Input type="email" required value={wEmail} onChange={e => setWEmail(e.target.value)} placeholder="user@example.com" /></div>
                    <div><Label>Role</Label>
                      <Select value={wRole} onValueChange={setWRole}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="student">Student</SelectItem>
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
                          <SelectContent className="max-h-72">{insts.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    )}
                    <Button className="w-full">Add to whitelist</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            {loading ? <div className="p-5 space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-12" />)}</div> :
              wl.length === 0 ? <EmptyState icon={Inbox} title="No emails whitelisted" hint="Click 'Add user' to authorise the first email." />
              : <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
                  {wl.map(w => (
                    <div key={w.id} className="p-4 flex items-center justify-between">
                      <div>
                        <div className="font-mono text-sm">{w.email}</div>
                        <div className="text-xs text-muted-foreground capitalize">{w.role.replace("_", " ")}</div>
                      </div>
                      {w.is_used ? <Badge variant="outline" className="text-muted-foreground">Registered</Badge> : <Badge className="bg-warning/15 text-warning border-warning/40">Pending signup</Badge>}
                    </div>
                  ))}
                </div>}
          </div>
        </TabsContent>

        <TabsContent value="institutions">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold">Institutions</h2>
              <Dialog open={openInst} onOpenChange={setOpenInst}>
                <DialogTrigger asChild><Button size="sm">Add institution</Button></DialogTrigger>
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
              insts.length === 0 ? <EmptyState icon={Building2} title="No institutions" />
              : <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
                  {insts.map(i => (
                    <div key={i.id} className="p-4">
                      <div className="font-medium">{i.name}</div>
                      <div className="text-xs text-muted-foreground">{i.location ?? "—"}</div>
                    </div>
                  ))}
                </div>}
          </div>
        </TabsContent>
        <TabsContent value="settings">
          <SettingsPanel />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
};

const Stat = ({ icon: Icon, label, value }: { icon: any; label: string; value: number }) => (
  <div className="bg-card border border-border rounded-lg p-4">
    <div className="flex items-center justify-between mb-1.5"><span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span><Icon className="size-4 text-muted-foreground" /></div>
    <div className="text-2xl font-bold">{value}</div>
  </div>
);

export default AdminDashboard;
