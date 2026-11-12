import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Accedi — Timbrino" },
      { name: "description", content: "Accedi all'area titolare di Timbrino." },
      { property: "og:title", content: "Accedi — Timbrino" },
      { property: "og:description", content: "Accedi all'area titolare di Timbrino." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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

  useEffect(() => {
    if (user) navigate({ to: "/dashboard" });
  }, [user, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error("Email o password non corretti");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-sm rounded-3xl border bg-card p-7 shadow-soft">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" /> Torna indietro
        </Link>
        <p className="mt-6 font-display text-xl text-accent">Timbrino</p>
        <h1 className="mt-2 text-3xl font-bold">Bentornato</h1>
        <p className="mt-2 text-sm text-muted-foreground">Accedi con le credenziali ricevute tramite invito dall'amministratore.</p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <Input type="email" required placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input type="password" required placeholder="Password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button disabled={busy} className="w-full rounded-full">{busy ? "Accesso…" : "Accedi"}</Button>
        </form>
      </div>
    </main>
  );
}
