// AI-generated skill summary for NATIONAL SKILL REGISTRY verification + student dashboards
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SkillItem { name: string; level: number; status: string; }

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { studentName, trade, skills } = await req.json() as {
      studentName: string; trade: string; skills: SkillItem[];
    };
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const list = (skills as SkillItem[])
      .filter(s => s.status === "valid")
      .map(s => `${s.name} (Level ${s.level}/4)`).join(", ") || "no verified skills yet";

    const prompt = `Write a concise 2-sentence professional summary for an employer reviewing this ITI/Polytechnic graduate. Be specific, factual, and confidence-building. No fluff, no markdown.

Student: ${studentName}
Trade: ${trade}
Verified skills: ${list}`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You write crisp, recruiter-friendly summaries of vocational graduates. 2 sentences max." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limited, please try again." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (resp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI error", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await resp.json();
    const summary = data.choices?.[0]?.message?.content?.trim() ?? "";
    return new Response(JSON.stringify({ summary }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
