import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Gift, ShieldCheck, Sparkles } from "lucide-react";
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
      { property: "og:description", content: "Gestisci le tue carte fedeltà con Timbrino." },
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
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div aria-hidden="true" className="pointer-events-none absolute -left-32 -top-32 size-96 rounded-full bg-accent/10 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -right-24 size-[30rem] rounded-full bg-primary/10 blur-3xl" />

      <div className="relative mx-auto grid min-h-screen w-full max-w-7xl items-center gap-10 px-5 py-8 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-12">
        <section className="mx-auto flex w-full max-w-xl flex-col justify-center lg:py-12">
          <Link to="/" className="mb-12 inline-flex w-fit items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="size-4" /> Torna al sito
          </Link>

          <BrandLogo linked={false} className="text-foreground" />

          <div className="mt-12 max-w-lg">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent">
              <Sparkles className="size-3.5" /> La fedeltà, più semplice
            </div>
            <h1 className="text-4xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-5xl">
              I tuoi clienti tornano.
              <span className="block text-accent">Tu pensi alla tua attività.</span>
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-muted-foreground">
              Entra nella tua area riservata e gestisci tessere, timbri e premi da un unico posto.
            </p>
          </div>

          <div className="relative mt-10 max-w-md overflow-hidden rounded-[2rem] border border-border/70 bg-card p-6 shadow-soft sm:p-8">
            <div aria-hidden="true" className="absolute -right-10 -top-10 size-36 rounded-full bg-accent/10 blur-2xl" />
            <div className="relative flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">La tua attività</p>
                <p className="mt-2 text-2xl font-bold text-foreground">Una visita, un timbro.</p>
                <p className="mt-1 text-sm text-muted-foreground">La fedeltà si trasforma in premi.</p>
              </div>
              <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-accent/12 text-accent">
                <Gift className="size-7" />
              </div>
            </div>
            <div className="relative mt-7 grid grid-cols-5 gap-2.5">
              {Array.from({ length: 10 }, (_, index) => (
                <div key={index} className={`flex aspect-square items-center justify-center rounded-xl border ${index < 7 ? "border-accent/20 bg-accent/10 text-accent" : "border-border bg-secondary/60 text-muted-foreground/40"}`}>
                  {index < 7 ? <Gift className="size-4" /> : <span className="size-2 rounded-full bg-current" />}
                </div>
              ))}
            </div>
            <div className="relative mt-5 flex items-center gap-2 rounded-xl bg-secondary/70 px-4 py-3 text-sm text-foreground">
              <ShieldCheck className="size-4 shrink-0 text-accent" />
              <span>Carte digitali, semplici da gestire e condividere.</span>
            </div>
          </div>

          <p className="mt-8 text-xs text-muted-foreground">Timbrino · Fidelizzazione digitale</p>
        </section>

        <section className="mx-auto w-full max-w-md">
          <div className="rounded-[2rem] border border-border/80 bg-card p-6 shadow-soft sm:p-9">
            <div className="mb-8">
              <p className="text-sm font-semibold text-accent">AREA RISERVATA</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground">Bentornato</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Accedi con le credenziali ricevute tramite invito dall'amministratore.
              </p>
            </div>

            <form onSubmit={submit} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="login-email" className="text-sm font-medium text-foreground">Indirizzo email</label>
                <Input id="login-email" type="email" required placeholder="nome@attivita.it" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 rounded-xl bg-background px-4" />
              </div>
              <div className="space-y-2">
                <label htmlFor="login-password" className="text-sm font-medium text-foreground">Password</label>
                <Input id="login-password" type="password" required placeholder="Inserisci la tua password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 rounded-xl bg-background px-4" />
              </div>
              <Button type="submit" disabled={busy || googleBusy} className="h-12 w-full rounded-xl text-sm font-semibold">
                {busy ? "Accesso in corso…" : <>Accedi alla tua area <ArrowRight className="ml-2 size-4" /></>}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center"><span className="bg-card px-3 text-xs font-medium text-muted-foreground">OPPURE</span></div>
            </div>

            <Button type="button" variant="outline" disabled={busy || googleBusy} onClick={signInWithGoogle} className="h-12 w-full rounded-xl border-border bg-background font-medium">
              <span className="mr-2 text-base font-bold" aria-hidden="true">G</span>
              {googleBusy ? "Reindirizzamento…" : "Continua con Google"}
            </Button>

            <p className="mt-7 text-center text-xs leading-5 text-muted-foreground">
              L'accesso è riservato ai gestori e ai collaboratori autorizzati.
            </p>
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Link to="/" className="font-medium transition-colors hover:text-foreground">Scopri Timbrino</Link>
            <span className="mx-2">·</span>
            Accesso protetto
          </p>
        </section>
      </div>
    </main>
  );
}
