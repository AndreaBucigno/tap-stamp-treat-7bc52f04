import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { lovable } from "@/integrations/lovable";
import { BrandLogo } from "@/components/BrandLogo";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Accedi — Timbrino" },
      { name: "description", content: "Accedi all'area riservata della tua attività su Timbrino." },
      { property: "og:title", content: "Accedi — Timbrino" },
      { property: "og:description", content: "Accedi all'area riservata di Timbrino." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  useEffect(() => {
    if (user) void navigate({ to: "/dashboard" });
  }, [user, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error("Email o password non corretti");
  }

  async function signInWithGoogle() {
    setGoogleBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
      if (result.error) toast.error(result.error.message);
    } catch {
      toast.error("Accesso Google non disponibile. Riprova.");
    } finally {
      setGoogleBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" /> Torna al sito
        </Link>

        <div className="rounded-3xl border border-border/80 bg-card p-7 shadow-soft sm:p-9">
          <div className="mb-8 flex justify-center">
            <BrandLogo linked={false} className="text-foreground" />
          </div>

          <div className="mb-7 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Bentornato</h1>
            <p className="mt-2 text-sm text-muted-foreground">Accedi alla tua area riservata.</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="login-email" className="text-sm font-medium text-foreground">Email</label>
              <Input id="login-email" type="email" required placeholder="nome@attivita.it" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 rounded-xl bg-background px-4" />
            </div>
            <div className="space-y-2">
              <label htmlFor="login-password" className="text-sm font-medium text-foreground">Password</label>
              <Input id="login-password" type="password" required placeholder="Inserisci la password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 rounded-xl bg-background px-4" />
            </div>
            <Button type="submit" disabled={busy || googleBusy} className="h-12 w-full rounded-xl text-sm font-semibold">
              {busy ? "Accesso in corso…" : "Accedi"}
            </Button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center"><span className="bg-card px-3 text-xs text-muted-foreground">oppure</span></div>
          </div>

          <Button type="button" variant="outline" disabled={busy || googleBusy} onClick={signInWithGoogle} className="h-12 w-full rounded-xl border-border bg-background font-medium">
            <span className="mr-2 text-base font-bold" aria-hidden="true">G</span>
            {googleBusy ? "Reindirizzamento…" : "Accedi con Google"}
          </Button>
        </div>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          Accesso riservato a gestori e collaboratori autorizzati.
        </p>
      </div>
    </main>
  );
}
