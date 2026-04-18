import { AppShell } from "@/components/AppShell";

const Terms = () => (
  <AppShell>
    <div className="max-w-3xl bg-card border border-border rounded-lg p-8 space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Terms of Use</h1>
      <p className="text-sm text-muted-foreground leading-relaxed">
        By accessing NATIONAL SKILL REGISTRY you agree to use the platform solely for lawful credential issuance and verification. Credentials are issued only by authorised ITI and Polytechnic institutions whitelisted by the system administrator.
      </p>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Verification results are provided for informational purposes. While each credential is sealed with a SHA-256 cryptographic hash, employers are encouraged to corroborate critical hiring decisions with the issuing institution.
      </p>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Misuse, forgery or unauthorised access of credentials is a punishable offence under applicable laws.
      </p>
    </div>
  </AppShell>
);

export default Terms;
