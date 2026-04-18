// Streaming seed for the FULL 50,000-row dataset.
// Phased / chunked so each call stays well under the edge-function timeout.
//
// Endpoints (POST or GET):
//   ?phase=status                   -> returns DB row counts
//   ?phase=reset&confirm=YES        -> truncates students/credentials/credential_logs/reassessment_requests
//   ?phase=refs                     -> inserts institutions + skills (idempotent by name)
//   ?phase=students&batch=N         -> inserts students_N.json (1500 rows)
//   ?phase=credentials&batch=N      -> inserts creds_N.json    (2500 rows)
//   ?phase=manifest                 -> returns batch counts + totals
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function loadJson<T>(path: string): Promise<T> {
  const url = new URL(path, import.meta.url);
  const txt = await Deno.readTextFile(url);
  return JSON.parse(txt) as T;
}

type Manifest = {
  student_batches: number;
  cred_batches: number;
  totals: { institutions: number; students: number; skills: number; credentials: number };
};
type Refs = {
  institutions: { ext_id: string; name: string; location: string }[];
  skills: { name: string; description: string }[];
};
type StudentRow = { ext_id: string; name: string; trade: string; iti_id: string };
type CredRow = {
  student_id: string; skill_name: string; level: number; status: string;
  hash: string; iti_id: string; created_at: string;
};

// In-memory caches keyed by ext_id ↔ uuid. Rebuilt per call from DB.
async function buildInstMap(): Promise<Map<string, string>> {
  // We map by name since institutions table doesn't store ext_id.
  // (ext_id only exists in seed file; institution names are unique per ext_id.)
  const { data } = await admin.from("institutions").select("id,name");
  const refs = await loadJson<Refs>("./chunks/refs.json");
  const nameToId = new Map((data ?? []).map((r: any) => [r.name, r.id]));
  const map = new Map<string, string>();
  for (const i of refs.institutions) {
    const id = nameToId.get(i.name);
    if (id) map.set(i.ext_id, id);
  }
  return map;
}

async function buildSkillMap(): Promise<Map<string, string>> {
  const { data } = await admin.from("skills").select("id,name");
  return new Map((data ?? []).map((r: any) => [r.name, r.id]));
}

async function buildStudentExtMap(): Promise<Map<string, string>> {
  // Student ext_ids aren't stored; we recompute mapping by joining on
  // (institution_id, name, trade). This works because seed data is deterministic.
  // Faster path: pull all students once.
  const map = new Map<string, string>();
  let from = 0; const PAGE = 1000;
  while (true) {
    const { data } = await admin
      .from("students")
      .select("id,name,trade,institution_id")
      .range(from, from + PAGE - 1);
    if (!data || data.length === 0) break;
    for (const s of data) {
      // Key: name|trade|institution_id
      map.set(`${s.name}|${s.trade}|${s.institution_id}`, s.id);
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return map;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const url = new URL(req.url);
  const phase = url.searchParams.get("phase") ?? "status";
  const batch = Number(url.searchParams.get("batch") ?? "0");

  try {
    if (phase === "status") {
      const [{ count: instCount }, { count: studCount }, { count: credCount }, { count: skillCount }] = await Promise.all([
        admin.from("institutions").select("*", { count: "exact", head: true }),
        admin.from("students").select("*", { count: "exact", head: true }),
        admin.from("credentials").select("*", { count: "exact", head: true }),
        admin.from("skills").select("*", { count: "exact", head: true }),
      ]);
      return json({ ok: true, counts: { institutions: instCount, students: studCount, credentials: credCount, skills: skillCount } });
    }

    if (phase === "manifest") {
      const m = await loadJson<Manifest>("./chunks/manifest.json");
      return json({ ok: true, manifest: m });
    }

    if (phase === "reset") {
      if (url.searchParams.get("confirm") !== "YES") {
        return json({ error: "Pass ?confirm=YES to reset" }, 400);
      }
      // Order matters: child rows first
      await admin.from("credential_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await admin.from("reassessment_requests").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await admin.from("credentials").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await admin.from("students").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      // Skills + institutions reused; do NOT touch profiles/whitelist/auth users.
      return json({ ok: true, reset: true });
    }

    if (phase === "refs") {
      const refs = await loadJson<Refs>("./chunks/refs.json");

      // Institutions: insert any missing by name
      const { data: existingInsts } = await admin.from("institutions").select("name");
      const existingInstNames = new Set((existingInsts ?? []).map((r: any) => r.name));
      const newInsts = refs.institutions.filter(i => !existingInstNames.has(i.name))
        .map(i => ({ name: i.name, location: i.location }));
      if (newInsts.length) {
        const { error } = await admin.from("institutions").insert(newInsts);
        if (error) return json({ error: error.message, at: "institutions" }, 500);
      }

      // Skills: same dedupe
      const { data: existingSkills } = await admin.from("skills").select("name");
      const existingSkillNames = new Set((existingSkills ?? []).map((r: any) => r.name));
      const newSkills = refs.skills.filter(s => !existingSkillNames.has(s.name));
      if (newSkills.length) {
        const { error } = await admin.from("skills").insert(newSkills);
        if (error) return json({ error: error.message, at: "skills" }, 500);
      }

      return json({ ok: true, inserted: { institutions: newInsts.length, skills: newSkills.length } });
    }

    if (phase === "students") {
      const rows = await loadJson<StudentRow[]>(`./chunks/students_${batch}.json`);
      const instMap = await buildInstMap();
      const insertRows = rows
        .filter(s => instMap.has(s.iti_id))
        .map(s => ({ name: s.name, trade: s.trade, institution_id: instMap.get(s.iti_id)! }));

      // Insert in 500-row sub-batches
      let inserted = 0;
      for (let i = 0; i < insertRows.length; i += 500) {
        const chunk = insertRows.slice(i, i + 500);
        const { data, error } = await admin.from("students").insert(chunk).select("id");
        if (error) return json({ error: error.message, at: `students batch ${batch} sub ${i}` }, 500);
        inserted += data?.length ?? 0;
      }
      return json({ ok: true, batch, inserted });
    }

    if (phase === "credentials") {
      const rows = await loadJson<CredRow[]>(`./chunks/creds_${batch}.json`);
      const [instMap, skillMap, studentMap] = await Promise.all([
        buildInstMap(), buildSkillMap(), buildStudentExtMap(),
      ]);

      // We need to map ext_id -> student uuid. Load students JSON to get the
      // (name, trade, iti_id) triple for each ext_id.
      const studJsonChunks = (await loadJson<Manifest>("./chunks/manifest.json")).student_batches;
      const extToTriple = new Map<string, { name: string; trade: string; iti_id: string }>();
      for (let i = 0; i < studJsonChunks; i++) {
        const arr = await loadJson<StudentRow[]>(`./chunks/students_${i}.json`);
        for (const s of arr) extToTriple.set(s.ext_id, { name: s.name, trade: s.trade, iti_id: s.iti_id });
      }

      const insertRows: any[] = [];
      let skipped = 0;
      for (const c of rows) {
        const triple = extToTriple.get(c.student_id);
        if (!triple) { skipped++; continue; }
        const instId = instMap.get(triple.iti_id);
        if (!instId) { skipped++; continue; }
        const studentUuid = studentMap.get(`${triple.name}|${triple.trade}|${instId}`);
        const skillId = skillMap.get(c.skill_name);
        if (!studentUuid || !skillId) { skipped++; continue; }

        insertRows.push({
          student_id: studentUuid,
          skill_id: skillId,
          institution_id: instId,
          level: Math.max(1, Math.min(4, c.level || 1)),
          status: c.status === "revoked" ? "revoked" : "valid",
          hash: c.hash || crypto.randomUUID().replace(/-/g, ""),
          created_at: c.created_at || new Date().toISOString(),
        });
      }

      let inserted = 0;
      for (let i = 0; i < insertRows.length; i += 500) {
        const chunk = insertRows.slice(i, i + 500);
        const { data, error } = await admin.from("credentials").insert(chunk).select("id");
        if (error) return json({ error: error.message, at: `credentials batch ${batch} sub ${i}` }, 500);
        inserted += data?.length ?? 0;
      }
      return json({ ok: true, batch, inserted, skipped });
    }

    return json({ error: `Unknown phase: ${phase}` }, 400);
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});
