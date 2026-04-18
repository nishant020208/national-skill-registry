import { Link } from "react-router-dom";
import { ShieldCheck, QrCode, Building2, Lock, FileCheck, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/AppShell";
import { QrScanner } from "@/components/QrScanner";

const features = [
  { icon: QrCode, title: "Instant QR verification", body: "Employers verify credentials in seconds via a single QR scan — no login required." },
  { icon: Lock, title: "Tamper-proof credentials", body: "Each credential is sealed with a SHA-256 cryptographic hash for integrity." },
  { icon: Building2, title: "Authorised issuance", body: "Only whitelisted ITI institutions and trainers can issue skill credentials." },
  { icon: FileCheck, title: "Downloadable certificates", body: "Government-style PDF certificates with QR for offline presentation." },
  { icon: Users, title: "Role-based access", body: "Separate consoles for ITI Admin, Principals, and Trainers with audit logs." },
  { icon: ShieldCheck, title: "Revocation & trust score", body: "Credentials can be revoked and institutional trust scores are publicly visible." },
];

const Index = () => (
  <AppShell>
    <section className="bg-card border border-border rounded-lg p-8 md:p-12 mb-8">
      <div className="max-w-3xl">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-primary/10 text-primary text-xs font-medium mb-4">
          <span className="size-1.5 rounded-full bg-success" />
          Verifiable Micro-Skill Passport
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight text-foreground">
          Government-issued skill credentials for ITI &amp; Polytechnic graduates.
        </h1>
        <p className="text-base text-muted-foreground mt-4 max-w-2xl">
          Credify provides ITI and Polytechnic graduates with tamper-proof skill credentials that employers can verify instantly via a QR scan.
        </p>
        <div className="flex flex-wrap items-center gap-3 mt-6">
          <Button asChild size="default">
            <Link to="/auth">Sign in to issue credentials <ArrowRight className="size-4 ml-1" /></Link>
          </Button>
          <Button asChild size="default" variant="outline">
            <Link to="/verify/aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa">View sample verification</Link>
          </Button>
        </div>
      </div>
    </section>

    <section className="mb-8">
      <QrScanner />
    </section>

    <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
      {features.map(f => (
        <div key={f.title} className="bg-card border border-border rounded-lg p-5">
          <div className="size-9 rounded-md bg-primary/10 grid place-items-center mb-3">
            <f.icon className="size-4 text-primary" />
          </div>
          <h3 className="font-semibold text-base mb-1 text-foreground">{f.title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{f.body}</p>
        </div>
      ))}
    </section>

    <section className="bg-card border border-border rounded-lg p-6 md:p-8">
      <h2 className="text-xl font-semibold tracking-tight">Demo accounts</h2>
      <p className="text-sm text-muted-foreground mt-1">Pre-whitelisted for evaluation. Sign up with any password (≥6 chars).</p>
      <div className="grid sm:grid-cols-3 gap-3 mt-5 text-sm">
        <div className="p-3 rounded-md bg-surface-1 border border-border">
          <div className="text-[10px] uppercase tracking-wider text-primary font-semibold mb-1">ITI Admin</div>
          <div className="font-mono text-xs">admin@credify.gov.in</div>
        </div>
        <div className="p-3 rounded-md bg-surface-1 border border-border">
          <div className="text-[10px] uppercase tracking-wider text-primary font-semibold mb-1">Principal</div>
          <div className="font-mono text-xs">principal@iti-mumbai.gov.in</div>
        </div>
        <div className="p-3 rounded-md bg-surface-1 border border-border">
          <div className="text-[10px] uppercase tracking-wider text-primary font-semibold mb-1">Trainer</div>
          <div className="font-mono text-xs">trainer@iti-mumbai.gov.in</div>
        </div>
      </div>
    </section>
  </AppShell>
);

export default Index;
