import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/activate")({
  head: () => ({ meta: [
    { title: "Attiva il tuo account — Timbrino" },
    { name: "description", content: "Imposta la password del tuo account Timbrino invitato dall’amministratore." },
    { property: "og:title", content: "Attiva il tuo account — Timbrino" },
    { property: "og:description", content: "Completa l’attivazione del tuo account Timbrino." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "robots", content: "noindex" },
  ] }),
  component: Activate,
});

function Activate() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { toast.error("Le password non coincidono"); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) { toast.error(error.message); return; }
      await navigate({ to: "/dashboard" });
    } catch { toast.error("Connessione non disponibile. Riprova."); }
    finally { setBusy(false); }
  }
  return <main className="flex min-h-screen items-center justify-center px-5">
    <div className="w-full max-w-sm rounded-3xl border bg-card p-7 shadow-soft">
      <p className="font-display text-xl text-accent">Timbrino</p>
      <h1 className="mt-2 text-3xl font-bold">Attiva il tuo account</h1>
      {loading ? <p className="mt-4">Caricamento…</p> : !user ? <p className="mt-4">Apri il link ricevuto nell’invito. Se è scaduto, contatta l’amministratore.</p> : <form onSubmit={submit} className="mt-6 space-y-3">
        <Input type="password" autoComplete="new-password" required minLength={8} aria-label="Nuova password" placeholder="Nuova password" value={password} onChange={e => setPassword(e.target.value)} />
        <Input type="password" autoComplete="new-password" required minLength={8} aria-label="Conferma password" placeholder="Conferma password" value={confirm} onChange={e => setConfirm(e.target.value)} />
        <Button disabled={busy} className="w-full">{busy ? "Attivazione…" : "Attiva account"}</Button>
      </form>}
    </div>
  </main>;
}