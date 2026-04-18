import { AppShell } from "@/components/AppShell";

const Privacy = () => (
  <AppShell>
    <div className="max-w-3xl bg-card border border-border rounded-lg p-8 space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Credify collects only the minimum personal information required to issue and verify skill credentials: name, trade, institution and the issued credentials themselves. We do not sell or share personal data with third parties.
      </p>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Public verification pages display only the credential metadata necessary for an employer to confirm authenticity. Cryptographic hashes are used to ensure integrity; no contact details are exposed publicly.
      </p>
      <p className="text-sm text-muted-foreground leading-relaxed">
        For data correction or deletion requests, please contact your issuing institution.
      </p>
    </div>
  </AppShell>
);

export default Privacy;
