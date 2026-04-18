import { AppShell } from "@/components/AppShell";

const sections: { title: string; body: string[] }[] = [
  {
    title: "About NATIONAL SKILL REGISTRY",
    body: [
      "NATIONAL SKILL REGISTRY is a Government of India skill initiative that issues verifiable, tamper-proof micro-skill credentials to graduates of Industrial Training Institutes (ITIs) and Polytechnics.",
      "The platform empowers MSME employers to verify candidate competencies in seconds via a simple QR scan, while preserving graduate privacy and institutional trust.",
    ],
  },
];

const About = () => (
  <AppShell>
    <div className="max-w-3xl bg-card border border-border rounded-lg p-8">
      {sections.map(s => (
        <div key={s.title} className="mb-6 last:mb-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-3">{s.title}</h1>
          {s.body.map((p, i) => <p key={i} className="text-sm text-muted-foreground leading-relaxed mb-3">{p}</p>)}
        </div>
      ))}
    </div>
  </AppShell>
);

export default About;
