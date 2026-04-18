import { useEffect, useMemo, useState } from "react";
import { Trophy, IdCard } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { computeSkillScore, scoreTier } from "@/lib/credify";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";

type Row = { id: string; name: string; trade: string; score: number; valid: number; tier: string; tierColor: string };

export const Leaderboard = ({ institutionId, highlightStudentId }: { institutionId?: string | null; highlightStudentId?: string }) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!institutionId) return;
    (async () => {
      setLoading(true);
      const { data: students } = await supabase.from("students")
        .select("id,name,trade").eq("institution_id", institutionId).limit(500);
      if (!students?.length) { setRows([]); setLoading(false); return; }
      const ids = students.map(s => s.id);
      const { data: creds } = await supabase.from("credentials")
        .select("student_id,level,status").in("student_id", ids);
      const byStudent = new Map<string, { level: number; status: string }[]>();
      (creds ?? []).forEach((c: any) => {
        const arr = byStudent.get(c.student_id) ?? [];
        arr.push({ level: c.level, status: c.status });
        byStudent.set(c.student_id, arr);
      });
      const ranked: Row[] = students.map(s => {
        const list = byStudent.get(s.id) ?? [];
        const score = computeSkillScore(list);
        const tier = scoreTier(score);
        return { id: s.id, name: s.name, trade: s.trade, score, valid: list.filter(x => x.status === "valid").length, tier: tier.label, tierColor: tier.color };
      }).filter(r => r.valid > 0).sort((a, b) => b.score - a.score || b.valid - a.valid).slice(0, 25);
      setRows(ranked); setLoading(false);
    })();
  }, [institutionId]);

  if (loading) return <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-14" />)}</div>;
  if (rows.length === 0) return <EmptyState icon={Trophy} title="No ranked students yet" hint="Students with verified credentials will appear here." />;

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="divide-y divide-border">
        {rows.map((r, i) => (
          <Link to={`/verify/${r.id}`} key={r.id}
            className={`p-4 flex items-center gap-4 hover:bg-surface-1 transition ${highlightStudentId === r.id ? "bg-primary/5" : ""}`}>
            <div className={`size-9 rounded-full grid place-items-center text-sm font-bold ${i < 3 ? "bg-warning/20 text-warning" : "bg-surface-1 text-muted-foreground border border-border"}`}>
              {i < 3 ? <Trophy className="size-4" /> : `#${i + 1}`}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{r.name}</div>
              <div className="text-xs text-muted-foreground">{r.trade} · {r.valid} verified skills</div>
            </div>
            <div className="text-right">
              <div className={`text-lg font-bold ${r.tierColor}`}>{r.score}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{r.tier}</div>
            </div>
            <IdCard className="size-4 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  );
};
