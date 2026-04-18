// One-shot seed: create demo accounts for each role.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const accounts = [
    { email: "admin@credify.in", name: "ITI Admin" },
    { email: "principal@credify.in", name: "Principal Mumbai" },
    { email: "trainer@credify.in", name: "Trainer Mumbai" },
  ];

  const results: any[] = [];
  for (const a of accounts) {
    const { data, error } = await admin.auth.admin.createUser({
      email: a.email,
      password: "Credify@2026",
      email_confirm: true,
      user_metadata: { name: a.name },
    });
    results.push({ email: a.email, ok: !error, error: error?.message, id: data?.user?.id });
  }

  return new Response(JSON.stringify({ results }, null, 2), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
