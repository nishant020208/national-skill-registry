import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Row = { id: string; name: string; trade: string; institutions: { name: string } | null };

const PassportBrowse = () => {
  const { profile } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      let query = supabase.from("students").select("id,name,trade,institutions(name)").order("created_at", { ascending: false }).limit(50);
      
      // Filter by institution if trainer/principal
      if (profile?.role !== "iti_admin" && profile?.institution_id) {
        query = query.eq("institution_id", profile.institution_id);
      }

      const { data } = await query;
      setRows((data ?? []) as Row[]); setLoading(false);
    })();
  }, [profile]);

  const filtered = rows.filter(r => r.name.toLowerCase().includes(q.toLowerCase()) || r.trade.toLowerCase().includes(q.toLowerCase()));

  return (
    <AppShell nav={[{ to: "/trainer", label: "Issue" }, { to: "/passport", label: "Browse passports" }]}>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Browse passports</h1>
        <p className="text-muted-foreground">Tap any student to view their public verification page.</p>
      </div>
      <div className="relative mb-6">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name or trade…" className="pl-9" />
      </div>
      <div className="glass-card overflow-hidden">
        {loading ? <div className="p-5 space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-14" />)}</div> :
          filtered.length === 0 ? <div className="p-12 text-center text-muted-foreground">No students match.</div> :
          <div className="divide-y divide-border/60">
            {filtered.map(r => (
              <div key={r.id} className="p-5 flex items-center justify-between hover:bg-surface-1/50 transition">
                <div>
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-muted-foreground">{r.trade} · {r.institutions?.name}</div>
                </div>
                <Button asChild size="sm" variant="outline"><Link to={`/verify/${r.id}`}>View<ExternalLink className="size-3.5 ml-1" /></Link></Button>
              </div>
            ))}
          </div>}
      </div>
    </AppShell>
  );
};

export default PassportBrowse;
