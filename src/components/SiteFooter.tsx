import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

export const SiteFooter = () => (
  <footer className="border-t border-border bg-card mt-12">
    <div className="gov-strip" />
    <div className="container py-8">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
        <div className="flex items-start gap-3 max-w-md">
          <div className="size-9 rounded-md bg-primary grid place-items-center shrink-0">
            <ShieldCheck className="size-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-semibold text-sm text-foreground">Powered by Credify</div>
            <div className="text-xs text-muted-foreground mt-0.5">A Government Skill Initiative</div>
            <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
              Credentials displayed on this portal are cryptographically sealed using SHA-256 and issued only by authorised ITI &amp; Polytechnic institutions. Verification is provided in good faith; employers are advised to corroborate with the issuing institution where required.
            </p>
          </div>
        </div>

        <nav className="flex flex-col gap-2 text-sm">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Information</div>
          <Link to="/about" className="text-foreground/80 hover:text-primary">About</Link>
          <Link to="/privacy" className="text-foreground/80 hover:text-primary">Privacy Policy</Link>
          <Link to="/terms" className="text-foreground/80 hover:text-primary">Terms of Use</Link>
        </nav>
      </div>

      <div className="border-t border-border mt-6 pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-muted-foreground">
        <div>© {new Date().getFullYear()} Credify · Government of India · All rights reserved.</div>
        <div className="font-mono">Last verified build · v1.0</div>
      </div>
    </div>
  </footer>
);
