import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const inviteManager = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    email: z.string().trim().email().max(254),
    name: z.string().trim().max(80),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId, _role: "admin",
    });
    if (roleError || !isAdmin) throw new Error("Operazione riservata all’amministratore");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email.toLowerCase(), {
      redirectTo: "https://timbrino.lovable.app/activate",
      data: { full_name: data.name },
    });
    if (error) return { error: /already|registered|exists/i.test(error.message)
      ? "Esiste già un account con questa email" : "Impossibile inviare l’invito. Riprova." };
    return { error: null };
  });