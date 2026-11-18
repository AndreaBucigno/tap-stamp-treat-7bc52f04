import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { passwordError } from "@/lib/account-validation";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [
    { title: "Nuova password — Timbrino" },
    { name: "description", content: "Recupera l’accesso al tuo account aziendale Timbrino." },
    { property: "og:title", content: "Nuova password — Timbrino" },
    { property: "og:description", content: "Imposta una nuova password per il tuo account Timbrino." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "robots", content: "noindex" },
  ] }),
  component: ResetPassword,
});

function ResetPassword() {
  const { user, loading } = useAuth();
  const [checked, setChecked] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // The auth client can consume the recovery hash before this component mounts.
    // Root captures PASSWORD_RECOVERY without registering a competing listener.
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const stored = sessionStorage.getItem("timbrino:password-recovery");
    setRecovery(hash.get("type") === "recovery" || (stored !== null && Date.now() - Number(stored) < 60 * 60 * 1000));
    setChecked(true);
  }, [user]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const invalid = passwordError(password, confirmation);
    if (invalid) { setError(invalid); return; }
    if (!user || !recovery || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await supabase.auth.updateUser({ password });
      if (result.error) { setError("Password non aggiornata. Verifica i requisiti o richiedi un nuovo link."); return; }
      sessionStorage.removeItem("timbrino:password-recovery");
      setDone(true);
      setPassword("");
      setConfirmation("");
    } catch { setError("Connessione non disponibile. Riprova."); }
    finally { setBusy(false); }
  }

  return <main className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
    <div className="w-full max-w-md space-y-6">
      <BrandLogo />
      <h1 className="text-3xl font-bold">Nuova password</h1>
      {!checked || loading ? <p role="status">Verifica del link…</p> : done ? <>
        <p role="status">La password è stata aggiornata.</p>
        <Button asChild className="w-full"><Link to="/dashboard">Vai alla tua attività</Link></Button>
      </> : !recovery || !user ? <>
        <p>Il link non è valido o è scaduto. Richiedi una nuova email di recupero.</p>
        <Button asChild variant="outline"><Link to="/auth">Torna all’accesso</Link></Button>
      </> : <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2"><label htmlFor="new-password">Nuova password</label><Input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} /></div>
        <div className="space-y-2"><label htmlFor="confirm-password">Conferma password</label><Input id="confirm-password" type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={e => setConfirmation(e.target.value)} /></div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button disabled={busy} className="w-full">{busy ? "Salvataggio…" : "Salva password"}</Button>
      </form>}
    </div>
  </main>;
}