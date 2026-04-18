import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, WifiOff, RefreshCw, ExternalLink, GraduationCap, BadgeCheck, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { sha256, levelLabel, levelColor, getOfflineQueue, addToOfflineQueue, removeFromQueue, type OfflineCredential } from "@/lib/credify";

type Student = { id: string; name: string; trade: string };
type Skill = { id: string; name: string };
type Cred = { id: string; level: number; status: string; hash: string; created_at: string; students: { name: string } | null; skills: { name: string } | null };

const TrainerDashboard = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [creds, setCreds] = useState<Cred[]>([]);
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState<OfflineCredential[]>(getOfflineQueue());
  const [offline, setOffline] = useState(!navigator.onLine);

  // Add student form
  const [sName, setSName] = useState(""); const [sTrade, setSTrade] = useState("");
  // Issue credential form
  const [studentId, setStudentId] = useState(""); const [skillId, setSkillId] = useState(""); const [level, setLevel] = useState("2");
  const [openIssue, setOpenIssue] = useState(false);
  const [openAdd, setOpenAdd] = useState(false);

  useEffect(() => {
    const on = () => setOffline(false), off = () => setOffline(true);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  const load = async () => {
    if (!profile?.institution_id) return;
    setLoading(true);
    const [s, sk, c] = await Promise.all([
      supabase.from("students").select("id,name,trade").eq("institution_id", profile.institution_id).order("created_at", { ascending: false }),
      supabase.from("skills").select("id,name").order("name"),
      supabase.from("credentials").select("id,level,status,hash,created_at,students(name),skills(name)").eq("institution_id", profile.institution_id).order("created_at", { ascending: false }).limit(20),
    ]);
    setStudents((s.data ?? []) as Student[]);
    setSkills((sk.data ?? []) as Skill[]);
    setCreds((c.data ?? []) as Cred[]);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [profile?.institution_id]);

  const addStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.institution_id) return;
    const { error } = await supabase.from("students").insert({ name: sName, trade: sTrade, institution_id: profile.institution_id });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Student added" }); setSName(""); setSTrade(""); setOpenAdd(false); load();
  };

  const issueCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile?.institution_id) return;
    const ts = new Date().toISOString();
    const hash = await sha256(`${studentId}|${skillId}|${level}|${ts}`);
    const student = students.find(s => s.id === studentId); const skill = skills.find(s => s.id === skillId);

    if (offline) {
      addToOfflineQueue({ tempId: crypto.randomUUID(), studentId, studentName: student?.name ?? "", skillId, skillName: skill?.name ?? "", level: Number(level), institutionId: profile.institution_id, hash, createdAt: ts });
      setQueue(getOfflineQueue());
      toast({ title: "Queued offline", description: "Will sync when you're back online." });
      setOpenIssue(false); return;
    }

    const { data, error } = await supabase.from("credentials").insert({
      student_id: studentId, skill_id: skillId, level: Number(level),
      issued_by: user.id, institution_id: profile.institution_id, hash,
    }).select("id").single();
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    if (data) await supabase.from("credential_logs").insert({ credential_id: data.id, action: "issued", performed_by: user.id });
    toast({ title: "Credential issued", description: `${skill?.name} L${level} → ${student?.name}` });
    setStudentId(""); setSkillId(""); setLevel("2"); setOpenIssue(false); load();
  };

  const syncQueue = async () => {
    if (!user) return;
    const q = getOfflineQueue();
    for (const c of q) {
      const { data } = await supabase.from("credentials").insert({
        student_id: c.studentId, skill_id: c.skillId, level: c.level,
        issued_by: user.id, institution_id: c.institutionId, hash: c.hash,
      }).select("id").single();
      if (data) await supabase.from("credential_logs").insert({ credential_id: data.id, action: "issued_offline_synced", performed_by: user.id });
      removeFromQueue(c.tempId);
    }
    setQueue(getOfflineQueue());
    toast({ title: "Synced", description: `${q.length} offline credentials pushed.` });
    load();
  };

  return (
    <AppShell nav={[{ to: "/trainer", label: "Issue" }, { to: "/passport", label: "Browse passports" }]}>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-1">Trainer Console</div>
          <h1 className="text-3xl font-bold tracking-tight">Issue verified credentials</h1>
        </div>
        <div className="flex gap-2">
          <Dialog open={openAdd} onOpenChange={setOpenAdd}>
            <DialogTrigger asChild><Button variant="outline"><Plus className="size-4 mr-1" />Add student</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add student</DialogTitle></DialogHeader>
              <form onSubmit={addStudent} className="space-y-4">
                <div><Label>Name</Label><Input required value={sName} onChange={e => setSName(e.target.value)} /></div>
                <div><Label>Trade</Label><Input required placeholder="e.g. Fitter, Electrician" value={sTrade} onChange={e => setSTrade(e.target.value)} /></div>
                <Button className="w-full bg-gradient-primary">Add</Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={openIssue} onOpenChange={setOpenIssue}>
            <DialogTrigger asChild><Button className="bg-gradient-primary shadow-glow"><BadgeCheck className="size-4 mr-1" />Issue credential</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Issue credential</DialogTitle></DialogHeader>
              <form onSubmit={issueCredential} className="space-y-4">
                <div><Label>Student</Label>
                  <Select value={studentId} onValueChange={setStudentId} required>
                    <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                    <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.name} · {s.trade}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Skill</Label>
                  <Select value={skillId} onValueChange={setSkillId} required>
                    <SelectTrigger><SelectValue placeholder="Select skill" /></SelectTrigger>
                    <SelectContent>{skills.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Level (1–4)</Label>
                  <Select value={level} onValueChange={setLevel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4].map(l => <SelectItem key={l} value={String(l)}>Level {l} — {levelLabel(l)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full bg-gradient-primary" disabled={!studentId || !skillId}>
                  {offline ? <><WifiOff className="size-4 mr-1" />Queue offline</> : "Issue & seal hash"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Offline queue banner */}
      {(offline || queue.length > 0) && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4 mb-6 flex items-center justify-between border-warning/40 bg-warning/5">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-warning/15 grid place-items-center"><WifiOff className="size-4 text-warning" /></div>
            <div>
              <div className="font-semibold">{offline ? "Offline mode active" : "Pending sync"}</div>
              <div className="text-xs text-muted-foreground">{queue.length} credential(s) waiting to sync</div>
            </div>
          </div>
          {!offline && queue.length > 0 && (
            <Button size="sm" onClick={syncQueue}><RefreshCw className="size-4 mr-1" />Sync now</Button>
          )}
        </motion.div>
      )}

      <div className="grid lg:grid-cols-3 gap-4 mb-8">
        <Stat icon={GraduationCap} label="Students" value={students.length} />
        <Stat icon={Award} label="Credentials issued" value={creds.length} />
        <Stat icon={BadgeCheck} label="Active" value={creds.filter(c => c.status === "valid").length} />
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-5 border-b border-border/60 flex items-center justify-between">
          <h2 className="font-semibold">Recent credentials</h2>
        </div>
        {loading ? (
          <div className="p-5 space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-14" />)}</div>
        ) : creds.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">No credentials yet — issue your first one above.</div>
        ) : (
          <div className="divide-y divide-border/60">
            {creds.map(c => (
              <div key={c.id} className="p-5 flex items-center justify-between hover:bg-surface-1/50 transition">
                <div>
                  <div className="font-medium">{c.students?.name} <span className="text-muted-foreground">· {c.skills?.name}</span></div>
                  <div className="text-xs text-muted-foreground font-mono mt-0.5">{c.hash.slice(0, 16)}…</div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={levelColor(c.level)}>L{c.level} {levelLabel(c.level)}</Badge>
                  {c.status === "valid" ? <Badge className="verify-badge">Valid</Badge> : <Badge variant="destructive">Revoked</Badge>}
                  <Button asChild size="icon" variant="ghost"><Link to={`/verify/${(c as any).students ? "" : ""}${(c as any).id ? "" : ""}`}><ExternalLink className="size-4" /></Link></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
};

const Stat = ({ icon: Icon, label, value }: { icon: any; label: string; value: number }) => (
  <div className="glass-card p-5 flex items-center justify-between">
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-3xl font-bold mt-1">{value}</div>
    </div>
    <div className="size-12 rounded-xl bg-primary/15 grid place-items-center"><Icon className="size-5 text-primary-glow" /></div>
  </div>
);

export default TrainerDashboard;
