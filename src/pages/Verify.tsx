import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, ShieldAlert, Building2, Sparkles, Download, ArrowLeft, Hash, History } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { levelLabel, levelColor } from "@/lib/credify";
import { SiteFooter } from "@/components/SiteFooter";

type Student = { id: string; name: string; trade: string; institution_id: string };
type Inst = { id: string; name: string; location: string | null };
type Cred = { id: string; level: number; status: string; hash: string; created_at: string; skills: { name: string } | null };
type Log = { id: string; action: string; timestamp: string; credential_id: string };

const Verify = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [institution, setInstitution] = useState<Inst | null>(null);
  const [creds, setCreds] = useState<Cred[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [summary, setSummary] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!studentId) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      const { data: s } = await supabase.from("students").select("id,name,trade,institution_id").eq("id", studentId).maybeSingle();
      if (!s) { setNotFound(true); setLoading(false); return; }
      const [{ data: inst }, { data: c }] = await Promise.all([
        supabase.from("institutions").select("*").eq("id", s.institution_id).maybeSingle(),
        supabase.from("credentials").select("id,level,status,hash,created_at,skills(name)").eq("student_id", studentId).order("created_at", { ascending: false }),
      ]);
      if (cancel) return;
      setStudent(s as Student); setInstitution(inst as Inst); setCreds((c ?? []) as Cred[]);
      setLoading(false);

      // Credential history (non-blocking)
      const credIds = (c ?? []).map((x: any) => x.id);
      if (credIds.length) {
        supabase.from("credential_logs").select("id,action,timestamp,credential_id").in("credential_id", credIds).order("timestamp", { ascending: false })
          .then(({ data }) => { if (!cancel) setLogs((data ?? []) as Log[]); });
      }

      // Async AI summary (non-blocking)
      const skills = (c ?? []).map((x: any) => ({ name: x.skills?.name ?? "Skill", level: x.level, status: x.status }));
      supabase.functions.invoke("skill-summary", { body: { studentName: s.name, trade: s.trade, skills } })
        .then(({ data }) => { if (!cancel && data?.summary) setSummary(data.summary); })
        .catch(() => {});
    })();
    return () => { cancel = true; };
  }, [studentId]);

  // Trust score for the institution
  const trustScore = useMemo(() => {
    if (creds.length === 0) return 100;
    return Math.round((creds.filter(c => c.status === "valid").length / creds.length) * 100);
  }, [creds]);

  const validCount = creds.filter(c => c.status === "valid").length;
  const allRevoked = creds.length > 0 && validCount === 0;
  const overallValid = validCount > 0;

  const downloadPDF = () => {
    if (!student || !institution) return;
    const doc = new jsPDF();
    const pageW = 210;

    // Tricolour accent strip (saffron / white / green)
    doc.setFillColor(255, 153, 51); doc.rect(0, 0, pageW, 2, "F");
    doc.setFillColor(255, 255, 255); doc.rect(0, 2, pageW, 2, "F");
    doc.setFillColor(19, 136, 8); doc.rect(0, 4, pageW, 2, "F");

    // Deep blue header band (#1E3A8A)
    doc.setFillColor(30, 58, 138);
    doc.rect(0, 6, pageW, 34, "F");

    // Logo block (white square with shield)
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(14, 14, 18, 18, 2, 2, "F");
    doc.setDrawColor(30, 58, 138);
    doc.setLineWidth(0.6);
    // Simple shield outline
    doc.setFillColor(30, 58, 138);
    doc.triangle(23, 18, 19, 21, 19, 26, "F");
    doc.triangle(23, 18, 27, 21, 27, 26, "F");
    doc.triangle(19, 26, 27, 26, 23, 30, "F");

    // Header text
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20).setFont("helvetica", "bold").text("CREDIFY", 38, 22);
    doc.setFontSize(9).setFont("helvetica", "normal").text("Verifiable Micro-Skill Passport", 38, 28);
    doc.setFontSize(8).text("Government of India · Skill Initiative", 38, 33);

    // Right-side: certificate label
    doc.setFontSize(8).setFont("helvetica", "normal");
    doc.text("CERTIFICATE OF SKILL VERIFICATION", pageW - 14, 22, { align: "right" });
    doc.setFontSize(7);
    doc.text(`Issued: ${new Date().toLocaleDateString("en-IN")}`, pageW - 14, 28, { align: "right" });
    doc.text(`Ref: ${student.id.slice(0, 8).toUpperCase()}`, pageW - 14, 33, { align: "right" });

    // Watermark seal (large faint circle behind content)
    doc.setDrawColor(30, 58, 138);
    doc.setLineWidth(0.4);
    doc.setFillColor(243, 244, 246);
    doc.circle(pageW / 2, 170, 45, "FD");
    doc.setTextColor(200, 210, 225);
    doc.setFontSize(36).setFont("helvetica", "bold");
    doc.text("CREDIFY", pageW / 2, 168, { align: "center" });
    doc.setFontSize(9).setFont("helvetica", "normal");
    doc.text("OFFICIAL · GOVT. OF INDIA", pageW / 2, 178, { align: "center" });

    // Holder details
    doc.setTextColor(20, 20, 30);
    doc.setFontSize(10).setFont("helvetica", "bold").text("CREDENTIAL HOLDER", 14, 56);
    doc.setDrawColor(30, 58, 138); doc.setLineWidth(0.4);
    doc.line(14, 58, 60, 58);

    doc.setFontSize(18).setFont("helvetica", "bold").setTextColor(30, 58, 138);
    doc.text(student.name, 14, 67);
    doc.setFontSize(10).setFont("helvetica", "normal").setTextColor(60, 60, 70);
    doc.text(`Trade: ${student.trade}`, 14, 74);
    doc.text(`Institution: ${institution.name}${institution.location ? `, ${institution.location}` : ""}`, 14, 80);
    doc.setFontSize(8).setTextColor(100, 100, 115);
    doc.text(`Verify online: ${window.location.origin}/verify/${student.id}`, 14, 86);

    autoTable(doc, {
      startY: 94,
      head: [["Skill", "Level", "Status", "Credential Hash"]],
      body: creds.map(c => [c.skills?.name ?? "—", `L${c.level} ${levelLabel(c.level)}`, c.status.toUpperCase(), c.hash.slice(0, 24) + "…"]),
      theme: "grid",
      headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: "bold", fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: [40, 40, 50] },
      alternateRowStyles: { fillColor: [248, 249, 251] },
      styles: { lineColor: [220, 224, 232], lineWidth: 0.2, cellPadding: 3 },
    });

    // Footer tricolour strip
    doc.setFillColor(255, 153, 51); doc.rect(0, 287, pageW, 2, "F");
    doc.setFillColor(255, 255, 255); doc.rect(0, 289, pageW, 2, "F");
    doc.setFillColor(19, 136, 8); doc.rect(0, 291, pageW, 2, "F");

    doc.setFontSize(8).setTextColor(110, 110, 125).setFont("helvetica", "normal");
    doc.text("This certificate is sealed with SHA-256 and verifiable in real-time via the QR code on the public verification page.", pageW / 2, 281, { align: "center" });

    doc.save(`NATIONAL SKILL REGISTRY-${student.name.replace(/\s+/g, "_")}.pdf`);
  };

  if (loading) {
    return (
      <div className="min-h-screen container py-12">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="skeleton h-32" />
          <div className="grid sm:grid-cols-2 gap-4"><div className="skeleton h-24" /><div className="skeleton h-24" /></div>
          <div className="skeleton h-48" />
        </div>
      </div>
    );
  }

  if (notFound || !student) {
    return (
      <div className="min-h-screen grid place-items-center px-4">
        <div className="text-center">
          <ShieldAlert className="size-12 mx-auto text-destructive mb-4" />
          <h1 className="text-2xl font-bold">Credential not found</h1>
          <p className="text-muted-foreground mt-2">This verification link is invalid.</p>
          <Button asChild variant="outline" className="mt-6"><Link to="/"><ArrowLeft className="size-4 mr-1" />Home</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-1">
      <div className="gov-strip" />
      <header className="border-b border-border bg-card">
        <div className="container py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="size-9 rounded-md bg-primary grid place-items-center"><ShieldCheck className="size-5 text-primary-foreground" /></div>
            <div className="leading-tight">
              <div className="font-semibold">NATIONAL SKILL REGISTRY</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Govt. Skill Passport</div>
            </div>
          </Link>
          <Button onClick={downloadPDF} variant="outline" size="sm"><Download className="size-4 mr-1" />Download Certificate</Button>
        </div>
      </header>

      <main className="container py-8 max-w-5xl">
        {/* Verification banner */}
        <div className={`bg-card border-2 rounded-lg p-6 mb-6 flex items-center gap-4 ${overallValid ? "border-success" : "border-destructive"}`}>
          <div className={`size-14 rounded-md grid place-items-center ${overallValid ? "bg-success" : "bg-destructive"}`}>
            {overallValid ? <ShieldCheck className="size-7 text-success-foreground" /> : <ShieldAlert className="size-7 text-destructive-foreground" />}
          </div>
          <div className="flex-1">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Verification Result</div>
            <div className={`text-2xl font-bold mt-0.5 ${overallValid ? "text-success" : "text-destructive"}`}>
              {overallValid ? "VERIFIED" : allRevoked ? "REVOKED" : "NO CREDENTIALS"}
            </div>
            <div className="text-sm text-muted-foreground mt-1">{validCount} valid · {creds.length - validCount} revoked · sealed by SHA-256</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_280px] gap-6 mb-6">
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">Skill Passport Holder</div>
            <h1 className="text-2xl font-bold tracking-tight">{student.name}</h1>
            <div className="text-sm text-muted-foreground mt-1">Trade: <span className="text-foreground font-medium">{student.trade}</span></div>
            <div className="flex items-center gap-2 mt-4 text-sm">
              <Building2 className="size-4 text-muted-foreground" />
              <span>{institution?.name}{institution?.location ? `, ${institution.location}` : ""}</span>
            </div>

            <div className="mt-6 p-4 rounded-md bg-surface-1 border border-border">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary font-semibold mb-2">
                <Sparkles className="size-3.5" />Skill Summary
              </div>
              {summary ? <p className="text-sm leading-relaxed text-foreground">{summary}</p> : <div className="space-y-1.5"><div className="skeleton h-3 w-full" /><div className="skeleton h-3 w-4/5" /></div>}
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6 flex flex-col items-center justify-center">
            <div className="bg-white p-3 rounded-md border border-border">
              <QRCodeSVG value={`${window.location.origin}/verify/${student.id}`} size={180} />
            </div>
            <div className="text-xs text-muted-foreground mt-3 text-center">Scan to re-verify</div>
            <div className="mt-4 w-full pt-4 border-t border-border text-center">
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Institution Trust Score</div>
              <div className="text-2xl font-bold text-success mt-1">{trustScore}%</div>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border font-semibold bg-surface-1">Verified Skills ({creds.length})</div>
          {creds.length === 0 ? <div className="p-12 text-center text-muted-foreground">No credentials issued.</div> :
            <div className="divide-y divide-border">
              {creds.map(c => (
                <div key={c.id} className="p-4 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <div className="font-semibold">{c.skills?.name}</div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono mt-1">
                      <Hash className="size-3" />{c.hash.slice(0, 32)}…
                    </div>
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

        {/* Credential history timeline */}
        {logs.length > 0 && (
          <div className="bg-card border border-border rounded-lg overflow-hidden mt-6">
            <div className="p-4 border-b border-border font-semibold bg-surface-1 flex items-center gap-2">
              <History className="size-4" /> Credential History
            </div>
            <div className="divide-y divide-border">
              {logs.map(l => (
                <div key={l.id} className="p-3 px-4 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <div className={`size-2 rounded-full ${l.action.includes("revok") ? "bg-destructive" : "bg-success"}`} />
                    <span className="capitalize font-medium">{l.action.replace(/_/g, " ")}</span>
                    <span className="text-xs text-muted-foreground font-mono">#{l.credential_id.slice(0, 8)}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(l.timestamp).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center mt-8">Verified by NATIONAL SKILL REGISTRY · No login required · Public verification page</p>
      </main>
      <SiteFooter />
    </div>
  );
};

export default Verify;
