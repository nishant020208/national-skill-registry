import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ShieldCheck, Download, Share2, ExternalLink, MessageSquarePlus, Plus, Trophy, Award, FileText, Sparkles, Building2, CheckCircle2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { levelLabel, statusBadgeClass, statusLabel, computeSkillScore, scoreTier } from "@/lib/credify";
import { EmptyState } from "@/components/EmptyState";
import { Leaderboard } from "@/components/Leaderboard";

type Student = { id: string; name: string; trade: string; institution_id: string };
type Cred = { id: string; level: number; status: string; hash: string; created_at: string; skill_id: string; skills: { name: string } | null };
type Req = { id: string; status: string; requested_level: number; note: string | null; created_at: string; rejection_reason: string | null; skill_id: string; skills: { name: string } | null };
type Reass = { id: string; reason: string; status: string; created_at: string };
type Skill = { id: string; name: string };
type Inst = { id: string; name: string; location: string | null };

const StudentDashboard = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "skills";

  const [student, setStudent] = useState<Student | null>(null);
  const [institution, setInstitution] = useState<Inst | null>(null);
  const [creds, setCreds] = useState<Cred[]>([]);
  const [requests, setRequests] = useState<Req[]>([]);
  const [reass, setReass] = useState<Reass[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);

  // Re-assessment dialog
  const [reason, setReason] = useState(""); const [credPick, setCredPick] = useState("");
  const [openReass, setOpenReass] = useState(false);

  // Request credential dialog
  const [reqSkill, setReqSkill] = useState(""); const [reqLevel, setReqLevel] = useState("2"); const [reqNote, setReqNote] = useState("");
  const [openReq, setOpenReq] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data: s } = await supabase.from("students").select("*").eq("user_id", user.id).maybeSingle();
    if (!s) { setLoading(false); return; }
    setStudent(s as Student);
    const [inst, c, r, ra, sk] = await Promise.all([
      supabase.from("institutions").select("*").eq("id", s.institution_id).maybeSingle(),
      supabase.from("credentials").select("id,level,status,hash,created_at,skill_id,skills(name)").eq("student_id", s.id).order("created_at", { ascending: false }),
      supabase.from("credential_requests").select("id,status,requested_level,note,created_at,rejection_reason,skill_id,skills(name)").eq("student_id", s.id).order("created_at", { ascending: false }),
      supabase.from("reassessment_requests").select("id,reason,status,created_at").eq("student_id", s.id).order("created_at", { ascending: false }),
      supabase.from("skills").select("id,name").order("name"),
    ]);
    setInstitution(inst.data as Inst);
    setCreds((c.data ?? []) as Cred[]);
    setRequests((r.data ?? []) as Req[]);
    setReass((ra.data ?? []) as Reass[]);
    setSkills((sk.data ?? []) as Skill[]);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const verifyUrl = student ? `${window.location.origin}/verify/${student.id}` : "";
  const validCreds = creds.filter(c => c.status === "valid");
  const score = useMemo(() => computeSkillScore(creds), [creds]);
  const tier = scoreTier(score);

  const copyShare = async () => {
    await navigator.clipboard.writeText(verifyUrl);
    toast({ title: "Link copied", description: "Share with employers to verify your skills." });
  };

  const submitReassessment = async () => {
    if (!student || !user || !reason.trim()) return;
    const { error } = await supabase.from("reassessment_requests").insert({
      student_id: student.id, credential_id: credPick || null, reason: reason.trim(),
      requested_by: user.id, institution_id: student.institution_id,
    });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Re-assessment submitted" });
    setReason(""); setCredPick(""); setOpenReass(false); load();
  };

  const submitRequest = async () => {
    if (!student || !reqSkill) return;
    const { error } = await supabase.from("credential_requests").insert({
      student_id: student.id, skill_id: reqSkill, requested_level: Number(reqLevel),
      note: reqNote.trim() || null, institution_id: student.institution_id,
    });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Request sent", description: "Your trainer will review it shortly." });
    setReqSkill(""); setReqLevel("2"); setReqNote(""); setOpenReq(false); load();
  };

  if (loading) return <AppShell><div className="space-y-4"><div className="skeleton h-40" /><div className="skeleton h-72" /></div></AppShell>;

  if (!student) {
    return (
      <AppShell>
        <div className="max-w-xl mx-auto text-center py-16">
          <ShieldCheck className="size-12 mx-auto text-primary mb-4" />
          <h1 className="text-2xl font-bold">No student record linked</h1>
          <p className="text-muted-foreground mt-2">
            We couldn't find a student record matching <span className="font-medium">{profile?.name}</span>. Please ask your trainer to register you, then sign in again.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* Hero — verified candidate card */}
      <div className="bg-card border border-border rounded-lg overflow-hidden mb-6">
        <div className="p-6 grid lg:grid-cols-[1fr_220px] gap-6 items-center">
          <div className="flex items-start gap-5">
            <div className="size-20 rounded-full bg-gradient-to-br from-primary to-primary/70 grid place-items-center text-2xl font-bold text-primary-foreground shrink-0">
              {student.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
            </div>
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Skill Passport Holder</div>
              <h1 className="text-2xl font-bold tracking-tight mt-0.5">{student.name}</h1>
              <div className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                <Award className="size-3.5" /> {student.trade}
              </div>
              <div className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <Building2 className="size-3.5" /> {institution?.name ?? "—"}{institution?.location ? `, ${institution.location}` : ""}
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <Badge className="bg-success text-success-foreground border-success/40 gap-1"><CheckCircle2 className="size-3" />VERIFIED CANDIDATE</Badge>
                <Badge variant="outline" className={`${tier.color} border-current/30`}>{tier.label}</Badge>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center bg-surface-1 border border-border rounded-lg p-4">
            <div className="bg-white p-2 rounded border border-border"><QRCodeSVG value={verifyUrl} size={130} /></div>
            <Button asChild size="sm" variant="outline" className="mt-3 w-full"><Link to={`/verify/${student.id}`} target="_blank">Scan QR Code</Link></Button>
          </div>
        </div>

        {/* Skill score band */}
        <div className="border-t border-border bg-surface-1 p-5 grid sm:grid-cols-[1fr_auto_auto_auto] gap-4 items-center">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Overall Skill Score</span>
              <span className="text-sm font-bold">{score}/100 · <span className={tier.color}>{tier.label}</span></span>
            </div>
            <Progress value={score} className="h-2" />
          </div>
          <ScoreStat label="Verified" value={validCreds.length} />
          <ScoreStat label="In review" value={creds.filter(c => c.status === "pending_principal").length + requests.filter(r => r.status === "pending_trainer").length} />
          <div className="flex gap-2">
            <Button onClick={copyShare} variant="outline" size="sm"><Share2 className="size-4 mr-1" />Share</Button>
            <Button asChild size="sm"><Link to={`/verify/${student.id}`} target="_blank"><Download className="size-4 mr-1" />PDF</Link></Button>
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setParams({ tab: v })} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="skills">My Skills ({creds.length})</TabsTrigger>
          <TabsTrigger value="requests">Requests ({requests.length})</TabsTrigger>
          <TabsTrigger value="certificates">Certificates ({validCreds.length})</TabsTrigger>
          <TabsTrigger value="rank">Rank</TabsTrigger>
        </TabsList>

        <TabsContent value="skills">
          <div className="flex justify-end mb-3 gap-2">
            <Dialog open={openReass} onOpenChange={setOpenReass}>
              <DialogTrigger asChild><Button variant="outline" size="sm"><MessageSquarePlus className="size-4 mr-1" />Request re-assessment</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Request re-assessment</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Select value={credPick} onValueChange={setCredPick}>
                    <SelectTrigger><SelectValue placeholder="Select a skill (optional)" /></SelectTrigger>
                    <SelectContent>{creds.map(c => <SelectItem key={c.id} value={c.id}>{c.skills?.name} · L{c.level}</SelectItem>)}</SelectContent>
                  </Select>
                  <Textarea placeholder="Why are you requesting re-assessment?" value={reason} onChange={e => setReason(e.target.value)} />
                </div>
                <DialogFooter><Button onClick={submitReassessment} disabled={!reason.trim()}>Submit</Button></DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={openReq} onOpenChange={setOpenReq}>
              <DialogTrigger asChild><Button size="sm"><Plus className="size-4 mr-1" />Request new credential</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Request a new skill credential</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Skill</Label>
                    <Select value={reqSkill} onValueChange={setReqSkill}>
                      <SelectTrigger><SelectValue placeholder="Choose a skill" /></SelectTrigger>
                      <SelectContent className="max-h-72">{skills.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Level (1–4)</Label>
                    <Select value={reqLevel} onValueChange={setReqLevel}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{[1,2,3,4].map(l => <SelectItem key={l} value={String(l)}>Level {l} — {levelLabel(l)}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Note for your trainer (optional)</Label>
                    <Textarea placeholder="Mention recent work, projects, or test scores…" value={reqNote} onChange={e => setReqNote(e.target.value)} />
                  </div>
                </div>
                <DialogFooter><Button onClick={submitRequest} disabled={!reqSkill}>Send request</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {creds.length === 0 ? (
            <div className="bg-card border border-border rounded-lg">
              <EmptyState icon={Award} title="No skills verified yet" hint="Tap 'Request new credential' to ask your trainer to verify your first skill." />
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {creds.map(c => {
                const pct = (c.level / 4) * 100;
                return (
                  <div key={c.id} className="bg-card border border-border rounded-lg p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="font-semibold">{c.skills?.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">Issued {new Date(c.created_at).toLocaleDateString()}</div>
                      </div>
                      <Badge className={statusBadgeClass(c.status)}>{statusLabel(c.status)}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>Level {c.level} · {levelLabel(c.level)}</span>
                      <span>{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="requests">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            {requests.length === 0 && reass.length === 0
              ? <EmptyState icon={FileText} title="No requests yet" hint="Your credential requests and re-assessments will appear here." />
              : (
                <div className="divide-y divide-border">
                  {requests.map(r => (
                    <div key={r.id} className="p-4">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <div className="font-semibold">{r.skills?.name} <span className="text-muted-foreground font-normal">· L{r.requested_level}</span></div>
                          <div className="text-xs text-muted-foreground mt-0.5">{new Date(r.created_at).toLocaleString()}</div>
                        </div>
                        <Badge className={statusBadgeClass(r.status)}>{statusLabel(r.status)}</Badge>
                      </div>
                      {r.note && <div className="text-sm mt-2 text-muted-foreground italic">"{r.note}"</div>}
                      {r.rejection_reason && <div className="text-sm mt-2 text-destructive">Reason: {r.rejection_reason}</div>}
                    </div>
                  ))}
                  {reass.map(r => (
                    <div key={r.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold">Re-assessment</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{new Date(r.created_at).toLocaleString()}</div>
                        </div>
                        <Badge variant="outline" className="capitalize">{r.status}</Badge>
                      </div>
                      <div className="text-sm mt-2 text-muted-foreground italic">"{r.reason}"</div>
                    </div>
                  ))}
                </div>
              )}
          </div>
        </TabsContent>

        <TabsContent value="certificates">
          {validCreds.length === 0
            ? <div className="bg-card border border-border rounded-lg"><EmptyState icon={Award} title="No certificates yet" hint="Verified credentials will be listed here, ready to download as a PDF." /></div>
            : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {validCreds.map(c => (
                  <div key={c.id} className="bg-card border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2"><Sparkles className="size-4 text-success" /><Badge className="bg-success/15 text-success border-success/30">Verified</Badge></div>
                    <div className="font-semibold">{c.skills?.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">L{c.level} · {levelLabel(c.level)}</div>
                    <Button asChild size="sm" variant="outline" className="w-full mt-3"><Link to={`/verify/${student.id}`} target="_blank"><Download className="size-4 mr-1" />Download PDF</Link></Button>
                  </div>
                ))}
              </div>
            )}
        </TabsContent>

        <TabsContent value="rank">
          <div className="mb-3 bg-card border border-border rounded-lg p-4 flex items-center gap-3">
            <Trophy className="size-5 text-warning" />
            <div className="flex-1">
              <div className="text-sm font-semibold">Your standing in {institution?.name}</div>
              <div className="text-xs text-muted-foreground">Ranked by Skill Score · weighted by level &amp; verification</div>
            </div>
          </div>
          <Leaderboard institutionId={student.institution_id} highlightStudentId={student.id} />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
};

const ScoreStat = ({ label, value }: { label: string; value: number }) => (
  <div className="text-center px-4">
    <div className="text-xl font-bold">{value}</div>
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
  </div>
);

export default StudentDashboard;
