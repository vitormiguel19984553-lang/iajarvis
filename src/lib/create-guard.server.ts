import { createServerClient } from "@supabase/ssr";
import { canUseTool, getCreateTool, type CreateTool } from "@/lib/create-tools";
import { rateLimit, sweep } from "@/lib/rate-limit.server";

export type GuardOk = {
  ok: true;
  userId: string;
  plan: "free" | "pro" | "ultra" | "enterprise";
  tool: CreateTool;
  apiKey: string;
};

export type GuardResult = GuardOk | { ok: false; response: Response };

/** Auth + plan gating + rate limit for every /api/create-* route. */
export async function guardCreate(
  request: Request,
  toolId: unknown,
  limitPerMinute = 15,
): Promise<GuardResult> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) {
    return { ok: false, response: new Response("Missing LOVABLE_API_KEY", { status: 500 }) };
  }

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return { ok: false, response: new Response("Unauthorized", { status: 401 }) };

  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: { getAll: () => [], setAll: () => {} },
      global: { headers: { Authorization: `Bearer ${token}` } },
    },
  );

  const { data: u, error } = await supabase.auth.getUser();
  if (error || !u.user) {
    return { ok: false, response: new Response("Unauthorized", { status: 401 }) };
  }

  if (typeof toolId !== "string") {
    return { ok: false, response: new Response("toolId inválido", { status: 400 }) };
  }
  const tool = getCreateTool(toolId);
  if (!tool) {
    return { ok: false, response: new Response("Ferramenta desconhecida", { status: 400 }) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_type,is_suspended")
    .eq("id", u.user.id)
    .maybeSingle();

  if (profile?.is_suspended) {
    return { ok: false, response: new Response("Conta suspensa", { status: 403 }) };
  }

  const plan = (profile?.plan_type ?? "free") as GuardOk["plan"];
  if (!canUseTool(plan, tool.id)) {
    return {
      ok: false,
      response: Response.json(
        { error: "upgrade_required", minPlan: tool.minPlan },
        { status: 402 },
      ),
    };
  }

  sweep();
  const rl = rateLimit(`create:${u.user.id}`, limitPerMinute, 60_000);
  if (!rl.ok) {
    return {
      ok: false,
      response: Response.json({ error: "rate_limited" }, { status: 429 }),
    };
  }

  return { ok: true, userId: u.user.id, plan, tool, apiKey };
}

export function buildInstruction(tool: CreateTool, fields: Record<string, string> | undefined) {
  const parts = [tool.instruction];
  if (fields) {
    for (const f of tool.fields ?? []) {
      const v = fields[f.id];
      if (v) parts.push(`${f.label}: ${v}.`);
    }
  }
  return parts.join(" ");
}
