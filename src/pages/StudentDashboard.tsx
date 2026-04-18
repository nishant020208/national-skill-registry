import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Download, Share2, ExternalLink, MessageSquarePlus } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { levelLabel, levelColor } from "@/lib/credify";

type Student = { id: string; name: string; trade: string; institution_id: string };
type Cred = { id: string; level: number; status: string; hash: string; created_at: string; skills: { name: string } | null };
type Req = { id: string; reason: string; status: string; created_at: string; credential_id: string | null };

const StudentDashboard = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [student, setStudent] = useState<Student | null>(null);
  const [creds, setCreds] = useState<Cred[]>([]);
  const [requests, setRequests] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState("");
  const [credPick, setCredPick] = useState<string>("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data: s } = await supabase.from("students").select("*").eq("user_id", user.id).maybeSingle();
      if (s) {
        setStudent(s as Student);
        const { data: c } = await supabase.from("credentials")
          .select("id,level,status,hash,created_at,skills(name)")
          .eq("student_id", s.id).order("created_at", { ascending: false });
        setCreds((c ?? []) as Cred[]);
        const { data: r } = await supabase.from("reassessment_requests")
          .select("id,reason,status,created_at,credential_id")
          .eq("student_id", s.id).order("created_at", { ascending: false });
        setRequests((r ?? []) as Req[]);
      }
      setLoading(false);
    })();
  }, [user]);

  const verifyUrl = student ? `${window.location.origin}/verify/${student.id}` : "";

  const copyShare = async () => {
    await navigator.clipboard.writeText(verifyUrl);
    toast({ title: "Link copied", description: "Share with employers to verify your skills." });
  };

  const submitRequest = async () => {
    if (!student || !user || !reason.trim()) return;
    const { error } = await supabase.from("reassessment_requests").insert({
      student_id: student.id,
      credential_id: credPick || null,
      reason: reason.trim(),
      requested_by: user.id,
      institution_id: student.institution_id,
    });
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Request submitted", description: "Your trainer will review it shortly." });
    setReason(""); setCredPick(""); setOpen(false);
    const { data: r } = await supabase.from("reassessment_requests")
      .select("id,reason,status,created_at,credential_id")
      .eq("student_id", student.id).order("created_at", { ascending: false });
    setRequests((r ?? []) as Req[]);
  };

  if (loading) return <AppShell><div className="space-y-4"><div className="skeleton h-32" /><div className="skeleton h-48" /></div></AppShell>;

  if (!student) {
    return (
      <AppShell>
        <div className="max-w-xl mx-auto text-center py-16">
          <ShieldCheck className="size-12 mx-auto text-primary mb-4" />
          <h1 className="text-2xl font-bold">No student record linked</h1>
          <p className="text-muted-foreground mt-2">
            We couldn't find a student record matching <span className="font-medium">{profile?.name}</span> at your institution.
            Please ask your trainer to register you, then sign in again.
          </p>
        </div>
      </AppShell>
    );
  }

  const validCount = creds.filter(c => c.status === "valid").length;

  return (
    <AppShell nav={[{ to: "/student", label: "My passport" }]}>
      <div className="grid lg:grid-cols-[1fr_280px] gap-6 mb-6">
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Skill Passport</div>
          <h1 className="text-3xl font-bold tracking-tight mt-1">{student.name}</h1>
          <div className="text-sm text-muted-foreground mt-1">Trade: <span className="font-medium text-foreground">{student.trade}</span></div>
          <div className="flex flex-wrap gap-2 mt-5">
            <Button asChild variant="outline" size="sm"><Link to={`/verify/${student.id}`} target="_blank"><ExternalLink className="size-4 mr-1" />Open public passport</Link></Button>
            <Button onClick={copyShare} variant="outline" size="sm"><Share2 className="size-4 mr-1" />Copy share link</Button>
            <Button asChild size="sm"><Link to={`/verify/${student.id}`} target="_blank"><Download className="size-4 mr-1" />Download PDF</Link></Button>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="p-4 rounded-md bg-surface-1 border border-border"><div className="text-xs text-muted-foreground">Valid</div><div className="text-2xl font-bold text-success">{validCount}</div></div>
            <div className="p-4 rounded-md bg-surface-1 border border-border"><div className="text-xs text-muted-foreground">Total</div><div className="text-2xl font-bold">{creds.length}</div></div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-5 flex flex-col items-center">
          <div className="bg-white p-3 rounded-md border border-border"><QRCodeSVG value={verifyUrl} size={170} /></div>
          <div className="text-xs text-muted-foreground mt-3 text-center">Show this QR to employers</div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden mb-6">
        <div className="p-4 border-b border-border font-semibold bg-surface-1 flex items-center justify-between">
          <span>My skills ({creds.length})</span>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm" variant="outline"><MessageSquarePlus className="size-4 mr-1" />Request re-assessment</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Request re-assessment</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Select value={credPick} onValueChange={setCredPick}>
                  <SelectTrigger><SelectValue placeholder="Select a skill (optional)" /></SelectTrigger>
                  <SelectContent>{creds.map(c => <SelectItem key={c.id} value={c.id}>{c.skills?.name} · L{c.level}</SelectItem>)}</SelectContent>
                </Select>
                <Textarea placeholder="Why are you requesting re-assessment?" value={reason} onChange={e => setReason(e.target.value)} />
              </div>
              <DialogFooter><Button onClick={submitRequest} disabled={!reason.trim()}>Submit</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        {creds.length === 0 ? <div className="p-12 text-center text-muted-foreground">No credentials yet.</div> :
          <div className="divide-y divide-border">
            {creds.map(c => (
              <div key={c.id} className="p-4 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="font-semibold">{c.skills?.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Issued {new Date(c.created_at).toLocaleDateString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={levelColor(c.level)}>L{c.level} · {levelLabel(c.level)}</Badge>
                  {c.status === "valid" ? <Badge className="verify-badge">Valid</Badge> : <Badge variant="destructive">Revoked</Badge>}
                </div>
              </div>
            ))}
          </div>}
      </div>

      {requests.length > 0 && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border font-semibold bg-surface-1">My re-assessment requests</div>
          <div className="divide-y divide-border">
            {requests.map(r => (
              <div key={r.id} className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm">{r.reason}</div>
                  <div className="text-xs text-muted-foreground mt-1">{new Date(r.created_at).toLocaleString()}</div>
                </div>
                <Badge variant={r.status === "pending" ? "outline" : "default"} className="capitalize">{r.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </AppShell>
  );
};

export default StudentDashboard;
