import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, ExternalLink, Download, ShieldCheck, Plus, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SiteFooter } from "@/components/SiteFooter";

type Row = {
  id: string; name: string; trade: string;
  institutions: { name: string; location: string | null } | null;
  credentials: { status: string; level: number }[];
};

const EmployerSearch = () => {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [shortlist, setShortlist] = useState<Row[]>([]);

  const search = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    const term = q.trim();
    let query = supabase.from("students")
      .select("id,name,trade,institutions(name,location),credentials(status,level)")
      .limit(50);
    if (term) query = query.or(`name.ilike.%${term}%,trade.ilike.%${term}%`);
    const { data } = await query;
    setRows((data ?? []) as Row[]);
    setLoading(false);
  };

  const toggleShortlist = (r: Row) => {
    setShortlist(prev => prev.find(x => x.id === r.id) ? prev.filter(x => x.id !== r.id) : [...prev, r]);
  };

  const exportCsv = () => {
    const list = shortlist.length ? shortlist : rows;
    const header = ["Name", "Trade", "Institution", "Location", "Valid Skills", "Total Skills", "Verify URL"];
    const lines = [header.join(",")];
    for (const r of list) {
      const valid = r.credentials.filter(c => c.status === "valid").length;
      const total = r.credentials.length;
      const inst = r.institutions?.name ?? "";
      const loc = r.institutions?.location ?? "";
      const url = `${window.location.origin}/verify/${r.id}`;
      const safe = (s: string) => `"${s.replace(/"/g, '""')}"`;
      lines.push([safe(r.name), safe(r.trade), safe(inst), safe(loc), valid, total, safe(url)].join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `credify-shortlist-${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-surface-1">
      <div className="gov-strip" />
      <header className="border-b border-border bg-card">
        <div className="container py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="size-9 rounded-md bg-primary grid place-items-center"><ShieldCheck className="size-5 text-primary-foreground" /></div>
            <div className="leading-tight">
              <div className="font-semibold">Credify · Employer Search</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Public · No login required</div>
            </div>
          </Link>
          <Button onClick={exportCsv} variant="outline" size="sm" disabled={rows.length === 0}>
            <Download className="size-4 mr-1" />Export {shortlist.length ? `${shortlist.length} shortlisted` : "results"} (CSV)
          </Button>
        </div>
      </header>

      <main className="container py-8 max-w-5xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Find verified ITI graduates</h1>
          <p className="text-muted-foreground mt-1">Search by name or trade. Every result links to a public, tamper-proof skill passport.</p>
        </div>
        <form onSubmit={search} className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={e => setQ(e.target.value)} placeholder="e.g. Welder, Electrician, Priya…" className="pl-9" />
          </div>
          <Button type="submit" disabled={loading}>{loading ? "Searching…" : "Search"}</Button>
        </form>

        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {loading ? <div className="p-5 space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-14" />)}</div> :
            rows.length === 0 ? <div className="p-12 text-center text-muted-foreground">Search for graduates to begin.</div> :
            <div className="divide-y divide-border">
              {rows.map(r => {
                const valid = r.credentials.filter(c => c.status === "valid").length;
                const isShort = !!shortlist.find(x => x.id === r.id);
                return (
                  <div key={r.id} className="p-4 flex items-center justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="font-semibold">{r.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {r.trade} · {r.institutions?.name}{r.institutions?.location ? `, ${r.institutions.location}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-success border-success/40">{valid} valid</Badge>
                      <Badge variant="outline">{r.credentials.length} total</Badge>
                      <Button size="sm" variant={isShort ? "default" : "outline"} onClick={() => toggleShortlist(r)}>
                        {isShort ? <><Check className="size-3.5 mr-1" />Shortlisted</> : <><Plus className="size-3.5 mr-1" />Shortlist</>}
                      </Button>
                      <Button asChild size="sm" variant="outline"><Link to={`/verify/${r.id}`}>Verify<ExternalLink className="size-3.5 ml-1" /></Link></Button>
                    </div>
                  </div>
                );
              })}
            </div>}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default EmployerSearch;
