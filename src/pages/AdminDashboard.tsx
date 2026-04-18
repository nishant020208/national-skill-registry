import { useEffect, useState } from "react";
import { Building2, UserPlus, Users, Award } from "lucide-react";
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

const AdminDashboard = () => {
  const { toast } = useToast();
  const [insts, setInsts] = useState<Inst[]>([]);
  const [wl, setWl] = useState<WL[]>([]);
  const [counts, setCounts] = useState({ creds: 0, students: 0 });
  const [loading, setLoading] = useState(true);

  // Forms
  const [iName, setIName] = useState(""); const [iLoc, setILoc] = useState("");
  const [wEmail, setWEmail] = useState(""); const [wRole, setWRole] = useState("trainer"); const [wInst, setWInst] = useState("");
  const [openInst, setOpenInst] = useState(false); const [openWL, setOpenWL] = useState(false);

  const load = async () => {
    setLoading(true);
    const [i, w, c, s] = await Promise.all([
      supabase.from("institutions").select("*").order("created_at", { ascending: false }),
      supabase.from("whitelist").select("*").order("created_at", { ascending: false }),
      supabase.from("credentials").select("id", { count: "exact", head: true }),
      supabase.from("students").select("id", { count: "exact", head: true }),
    ]);
    setInsts((i.data ?? []) as Inst[]); setWl((w.data ?? []) as WL[]);
    setCounts({ creds: c.count ?? 0, students: s.count ?? 0 });
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

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

  return (
    <AppShell nav={[{ to: "/admin", label: "Overview" }]}>
      <div className="mb-8">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-1">ITI Admin Console</div>
        <h1 className="text-3xl font-bold tracking-tight">National oversight</h1>
      </div>

      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <Stat icon={Building2} label="Institutions" value={insts.length} />
        <Stat icon={Users} label="Students" value={counts.students} />
        <Stat icon={Award} label="Credentials" value={counts.creds} />
        <Stat icon={UserPlus} label="Whitelisted" value={wl.length} />
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
                  <Button className="w-full bg-gradient-primary">Add</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          {loading ? <div className="p-5 space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-12" />)}</div> :
            <div className="divide-y divide-border/60">
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
                  <Button className="w-full bg-gradient-primary">Add</Button>
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
