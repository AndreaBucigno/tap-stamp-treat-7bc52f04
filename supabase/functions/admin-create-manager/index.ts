import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Metodo non consentito" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Configurazione server incompleta" }, 500);

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json({ error: "Accesso negato" }, 401);

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const token = authorization.slice("Bearer ".length);
  const { data: authData, error: authError } = await adminClient.auth.getUser(token);
  if (authError || !authData.user) return json({ error: "Sessione non valida" }, 401);

  const { data: role, error: roleError } = await adminClient
    .from("user_roles")
    .select("id")
    .eq("user_id", authData.user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (roleError || !role) return json({ error: "Operazione riservata all'amministratore" }, 403);

  let body: { email?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Richiesta non valida" }, 400);
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const name = body.name?.trim().slice(0, 80) ?? "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Inserisci un indirizzo email valido" }, 400);

  const siteUrl = Deno.env.get("SITE_URL") ?? req.headers.get("origin");
  if (!siteUrl) return json({ error: "URL del sito non configurato" }, 500);

  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo: new URL("/auth", siteUrl).toString(),
    data: name ? { full_name: name, account_type: "manager" } : { account_type: "manager" },
  });
  if (error) {
    const status = /already|registered|exists/i.test(error.message) ? 409 : 400;
    return json({ error: status === 409 ? "Esiste già un account con questa email" : error.message }, status);
  }
  return json({ success: true, user_id: data.user.id }, 200);
});

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
