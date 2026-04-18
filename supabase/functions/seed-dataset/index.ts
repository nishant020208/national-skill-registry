// Seeds institutions / skills / students / credentials from the bundled dataset.
// Idempotent: skips if institutions count > 5 already.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import data from "./data.json" with { type: "json" };

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Seed = {
  institutions: { ext_id: string; name: string; location: string }[];
  skills: { name: string; description: string }[];
  students: { ext_id: string; name: string; trade: string; iti_id: string }[];
  credentials: { student_id: string; skill_name: string; level: number; status: string; hash: string; iti_id: string; created_at: string }[];
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const seed = data as Seed;
  const log: string[] = [];

  // Skip if already seeded heavily
  const { count: instCount } = await admin.from("institutions").select("*", { count: "exact", head: true });
  if ((instCount ?? 0) > 20) {
    return new Response(JSON.stringify({ skipped: true, message: `Already ${instCount} institutions` }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  // 1. Institutions
  const instMap = new Map<string, string>(); // ext_id -> uuid
  const { data: insertedInsts, error: instErr } = await admin
    .from("institutions")
    .insert(seed.institutions.map(i => ({ name: i.name, location: i.location })))
    .select("id,name");
  if (instErr) return new Response(JSON.stringify({ error: instErr.message }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  const nameToInstId = new Map(insertedInsts!.map(r => [r.name, r.id]));
  for (const i of seed.institutions) instMap.set(i.ext_id, nameToInstId.get(i.name)!);
  log.push(`Inserted ${insertedInsts!.length} institutions`);

  // 2. Skills (skip duplicates)
  const { data: existingSkills } = await admin.from("skills").select("id,name");
  const skillNameToId = new Map<string, string>(existingSkills?.map(s => [s.name, s.id]) ?? []);
  const newSkills = seed.skills.filter(s => !skillNameToId.has(s.name));
  if (newSkills.length) {
    const { data: ins } = await admin.from("skills").insert(newSkills).select("id,name");
    ins?.forEach(s => skillNameToId.set(s.name, s.id));
  }
  log.push(`Skills total ${skillNameToId.size}`);

  // 3. Students
  const studentMap = new Map<string, string>(); // ext_id -> uuid
  const studentRows = seed.students
    .filter(s => instMap.has(s.iti_id))
    .map(s => ({ name: s.name, trade: s.trade, institution_id: instMap.get(s.iti_id)! }));
  // Insert in batches of 200
  const insertedStudents: { id: string }[] = [];
  for (let i = 0; i < studentRows.length; i += 200) {
    const batch = studentRows.slice(i, i + 200);
    const { data: ins, error } = await admin.from("students").insert(batch).select("id");
    if (error) return new Response(JSON.stringify({ error: error.message, at: "students" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
    insertedStudents.push(...(ins ?? []));
  }
  // Map ext_id -> new uuid (preserves order since insert returns in insert order)
  const validStudents = seed.students.filter(s => instMap.has(s.iti_id));
  validStudents.forEach((s, i) => studentMap.set(s.ext_id, insertedStudents[i].id));
  log.push(`Inserted ${insertedStudents.length} students`);

  // 4. Credentials
  const credRows = seed.credentials
    .filter(c => studentMap.has(c.student_id) && skillNameToId.has(c.skill_name) && instMap.has(c.iti_id))
    .map(c => ({
      student_id: studentMap.get(c.student_id)!,
      skill_id: skillNameToId.get(c.skill_name)!,
      institution_id: instMap.get(c.iti_id)!,
      level: Math.max(1, Math.min(4, c.level || 1)),
      status: c.status === "revoked" ? "revoked" : "valid",
      hash: c.hash || crypto.randomUUID().replace(/-/g, ""),
      created_at: c.created_at,
    }));

  let credInserted = 0;
  for (let i = 0; i < credRows.length; i += 200) {
    const batch = credRows.slice(i, i + 200);
    const { data: ins, error } = await admin.from("credentials").insert(batch).select("id");
    if (error) return new Response(JSON.stringify({ error: error.message, at: "credentials" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
    credInserted += ins?.length ?? 0;
  }
  log.push(`Inserted ${credInserted} credentials`);

  return new Response(JSON.stringify({ ok: true, log }, null, 2), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
