import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, WifiOff, RefreshCw, Users, BadgeCheck, Award, Inbox, Trophy, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { sha256, levelLabel, statusBadgeClass, statusLabel, getOfflineQueue, addToOfflineQueue, removeFromQueue, type OfflineCredential } from "@/lib/credify";
import { EmptyState } from "@/components/EmptyState";
import { Leaderboard } from "@/components/Leaderboard";

type Student = { id: string; name: string; trade: string; user_id: string | null };
type Skill = { id: string; name: string };
type Cred = { id: string; level: number; status: string; hash: string; created_at: string; student_id: string; students: { name: string } | null; skills: { name: string } | null };
type Req = { id: string; status: string; requested_level: number; note: string | null; created_at: string; student_id: string; skill_id: string; students: { name: string } | null; skills: { name: string } | null };
type Reass = { id: string; reason: string; status: string; created_at: string; student_id: string; students: { name: string } | null };

const TrainerDashboard = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [creds, setCreds] = useState<Cred[]>([]);
  const [requests, setRequests] = useState<Req[]>([]);
  const [reass, setReass] = useState<Reass[]>([]);
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState<OfflineCredential[]>(getOfflineQueue());
  const [offline, setOffline] = useState(!navigator.onLine);

  const [sName, setSName] = useState(""); const [sTrade, setSTrade] = useState("");
  const [openAdd, setOpenAdd] = useState(false);

  useEffect(() => {
    const on = () => setOffline(false), off = () => setOffline(true);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  const load = async () => {
    if (!profile?.institution_id) { setLoading(false); return; }
    setLoading(true);
    const [s, sk, c, r, ra] = await Promise.all([
      supabase.from("students").select("id,name,trade,user_id").eq("institution_id", profile.institution_id).order("created_at", { ascending: false }),
      supabase.from("skills").select("id,name").order("name"),
      supabase.from("credentials").select("id,level,status,hash,created_at,student_id,students(name),skills(name)").eq("institution_id", profile.institution_id).order("created_at", { ascending: false }).limit(100),
      supabase.from("credential_requests").select("id,status,requested_level,note,created_at,student_id,skill_id,students(name),skills(name)").eq("institution_id", profile.institution_id).order("created_at", { ascending: false }),
      supabase.from("reassessment_requests").select("id,reason,status,created_at,student_id,students(name)").eq("institution_id", profile.institution_id).order("created_at", { ascending: false }),
    ]);
    setStudents((s.data ?? []) as Student[]);
    setSkills((sk.data ?? []) as Skill[]);
    setCreds((c.data ?? []) as Cred[]);
    setRequests((r.data ?? []) as Req[]);
    setReass((ra.data ?? []) as Reass[]);
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

  const approveRequest = async (req: Req) => {
    if (!user || !profile?.institution_id) return;
    const ts = new Date().toISOString();
    const hash = await sha256(`${req.student_id}|${req.skill_id}|${req.requested_level}|${ts}`);
    // Create credential at pending_principal (trainer-approved)
    const { data: cred, error } = await supabase.from("credentials").insert({
      student_id: req.student_id, skill_id: req.skill_id, level: req.requested_level,
      issued_by: user.id, institution_id: profile.institution_id, hash,
      status: "pending_principal" as any,
      trainer_approved_by: user.id, trainer_approved_at: ts,
    }).select("id").single();
    if (error || !cred) return toast({ title: "Failed", description: error?.message, variant: "destructive" });
    await supabase.from("credential_logs").insert({ credential_id: cred.id, action: "trainer_approved", performed_by: user.id });
    await supabase.from("credential_requests").update({
      status: "pending_principal", trainer_id: user.id, trainer_action_at: ts, credential_id: cred.id,
    }).eq("id", req.id);
    toast({ title: "Approved → sent to Principal" });
    load();
  };

  const rejectRequest = async (req: Req, reason: string) => {
    if (!user) return;
    const ts = new Date().toISOString();
    await supabase.from("credential_requests").update({
      status: "rejected", trainer_id: user.id, trainer_action_at: ts, rejection_reason: reason,
    }).eq("id", req.id);
    toast({ title: "Request rejected" });
    load();
  };

  const updateReass = async (id: string, status: string) => {
    const { error } = await supabase.from("reassessment_requests").update({ status }).eq("id", id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: `Marked ${status}` }); load();
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

  const pendingForTrainer = requests.filter(r => r.status === "pending_trainer");
  const approvedRequests = requests.filter(r => r.status === "pending_principal" || r.status === "approved");
  const pendingReass = reass.filter(r => r.status === "pending");
  const validCreds = creds.filter(c => c.status === "valid");

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-1">Trainer Console</div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back, {profile?.name?.split(" ")[0] ?? "Trainer"}</h1>
          <p className="text-sm text-muted-foreground mt-1">Review student requests, manage your trainees and track verified credentials.</p>
        </div>
        <Dialog open={openAdd} onOpenChange={setOpenAdd}>
          <DialogTrigger asChild><Button variant="outline"><Plus className="size-4 mr-1" />Add student</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add student</DialogTitle></DialogHeader>
            <form onSubmit={addStudent} className="space-y-4">
              <div><Label>Name</Label><Input required value={sName} onChange={e => setSName(e.target.value)} /></div>
              <div><Label>Trade</Label><Input required placeholder="e.g. Fitter, Electrician" value={sTrade} onChange={e => setSTrade(e.target.value)} /></div>
              <Button className="w-full">Add</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {(offline || queue.length > 0) && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-warning/40 rounded-lg p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <WifiOff className="size-5 text-warning" />
            <div>
              <div className="font-semibold">{offline ? "Offline mode active" : "Pending sync"}</div>
              <div className="text-xs text-muted-foreground">{queue.length} credential(s) waiting to sync</div>
            </div>
          </div>
          {!offline && queue.length > 0 && <Button size="sm" onClick={syncQueue}><RefreshCw className="size-4 mr-1" />Sync now</Button>}
        </motion.div>
      )}

      <div className="grid sm:grid-cols-4 gap-3 mb-6">
        <Stat icon={Users} label="Students" value={students.length} />
        <Stat icon={Inbox} label="Pending requests" value={pendingForTrainer.length} highlight={pendingForTrainer.length > 0} />
        <Stat icon={Award} label="Verified credentials" value={validCreds.length} />
        <Stat icon={BadgeCheck} label="Re-assessment" value={pendingReass.length} highlight={pendingReass.length > 0} />
      </div>

      <Tabs defaultValue="students" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="students">Students ({students.length})</TabsTrigger>
          <TabsTrigger value="requests">Issue Requests ({pendingForTrainer.length})</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="reass">Re-assessment ({pendingReass.length})</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        </TabsList>

        <TabsContent value="students">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            {loading ? <div className="p-5 space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-14" />)}</div>
              : students.length === 0 ? <EmptyState icon={Users} title="No students found" hint="Add a student or whitelist their email so they can register themselves." />
              : <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
                  {students.map(s => (
                    <Link to={`/verify/${s.id}`} key={s.id} className="p-4 flex items-center justify-between hover:bg-surface-1 transition">
                      <div>
                        <div className="font-semibold">{s.name}</div>
                        <div className="text-xs text-muted-foreground">{s.trade}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {s.user_id ? <Badge className="bg-success/15 text-success border-success/30">Linked</Badge> : <Badge variant="outline">Not registered</Badge>}
                        <ExternalLink className="size-4 text-muted-foreground" />
                      </div>
                    </Link>
                  ))}
                </div>}
          </div>
        </TabsContent>

        <TabsContent value="requests">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            {pendingForTrainer.length === 0
              ? <EmptyState icon={Inbox} title="Inbox zero" hint="No pending issue requests from students right now." />
              : <div className="divide-y divide-border">
                  {pendingForTrainer.map(r => <RequestRow key={r.id} req={r} onApprove={() => approveRequest(r)} onReject={(reason) => rejectRequest(r, reason)} />)}
                </div>}
          </div>
        </TabsContent>

        <TabsContent value="approved">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            {approvedRequests.length === 0
              ? <EmptyState icon={CheckCircle2} title="No approvals yet" hint="Once you approve student requests, they'll appear here awaiting Principal review." />
              : <div className="divide-y divide-border">
                  {approvedRequests.map(r => (
                    <div key={r.id} className="p-4 flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{r.students?.name} <span className="text-muted-foreground font-normal">· {r.skills?.name}</span></div>
                        <div className="text-xs text-muted-foreground">L{r.requested_level} · {new Date(r.created_at).toLocaleString()}</div>
                      </div>
                      <Badge className={statusBadgeClass(r.status)}>{statusLabel(r.status)}</Badge>
                    </div>
                  ))}
                </div>}
          </div>
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
                        <Button size="sm" className="flex-1" onClick={() => updateReass(r.id, "approved")}><CheckCircle2 className="size-4 mr-1" />Approve</Button>
                        <Button size="sm" variant="outline" className="flex-1 text-destructive border-destructive/40" onClick={() => updateReass(r.id, "rejected")}><XCircle className="size-4 mr-1" />Reject</Button>
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

const Stat = ({ icon: Icon, label, value, highlight }: { icon: any; label: string; value: number; highlight?: boolean }) => (
  <div className={`bg-card border rounded-lg p-4 ${highlight ? "border-warning/40" : "border-border"}`}>
    <div className="flex items-center justify-between mb-1.5">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <Icon className={`size-4 ${highlight ? "text-warning" : "text-muted-foreground"}`} />
    </div>
    <div className="text-2xl font-bold">{value}</div>
  </div>
);

const RequestRow = ({ req, onApprove, onReject }: { req: any; onApprove: () => void; onReject: (reason: string) => void }) => {
  const [reason, setReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="font-semibold">{req.students?.name} <span className="text-muted-foreground font-normal">requesting</span> {req.skills?.name}</div>
          <div className="text-xs text-muted-foreground">Level {req.requested_level} · {levelLabel(req.requested_level)} · {new Date(req.created_at).toLocaleString()}</div>
        </div>
        <Badge className={statusBadgeClass("pending_trainer")}>Awaiting trainer</Badge>
      </div>
      {req.note && <div className="text-sm p-3 rounded bg-surface-1 border border-border italic text-muted-foreground">"{req.note}"</div>}
      {!showReject ? (
        <div className="flex gap-2">
          <Button size="sm" className="flex-1" onClick={onApprove}><CheckCircle2 className="size-4 mr-1" />Approve</Button>
          <Button size="sm" variant="outline" className="flex-1 text-destructive border-destructive/40" onClick={() => setShowReject(true)}><XCircle className="size-4 mr-1" />Reject</Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Textarea placeholder="Reason for rejection (visible to student)" value={reason} onChange={e => setReason(e.target.value)} />
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowReject(false)}>Cancel</Button>
            <Button size="sm" variant="destructive" disabled={!reason.trim()} onClick={() => onReject(reason.trim())}>Confirm reject</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainerDashboard;
