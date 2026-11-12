import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, Trash2, Users, ChevronDown, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Pannello amministratore — Timbrino" },
      { name: "description", content: "Gestione di tutte le attività registrate su Timbrino." },
      { property: "og:title", content: "Pannello amministratore — Timbrino" },
      { property: "og:description", content: "Gestione di tutte le attività registrate." },
      { name: "robots", content: "noindex" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["admin-venues"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_venues");
      if (error) throw error;
      return data ?? [];
    },
  });
  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    await navigate({ to: "/auth", replace: true });
  }
  if (q.isLoading) return <div className="p-10 text-center text-muted-foreground">Caricamento…</div>;
  if (q.isError) return <div className="p-10 text-center">Accesso riservato all'amministratore.<div className="mt-4"><Button variant="outline" onClick={signOut}>Esci</Button></div></div>;
  const v = q.data!;
  const sum = (k: "cards_count" | "stamps_total" | "rewards_total") => v.reduce((a, x) => a + Number(x[k]), 0);
  return (
    <main className="mx-auto max-w-5xl px-5 py-8">
      <header className="flex items-center justify-between">
        <span className="font-display text-xl text-accent">Timbrino · Admin</span>
        <Button variant="ghost" size="sm" onClick={signOut}><LogOut /> Esci</Button>
      </header>
      <h1 className="mt-6 text-4xl font-bold">Dashboard amministratore</h1>\n      <CreateManagerPanel />\n      <h2 className="mt-8 text-2xl font-semibold">Tutti i locali</h2>
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {([["Locali", v.length], ["Clienti", sum("cards_count")], ["Timbri attivi", sum("stamps_total")], ["Premi dati", sum("rewards_total")]] as const).map(([l, n]) => (
          <div key={l} className="rounded-2xl border bg-card p-4 text-center">
            <div className="font-display text-3xl font-bold">{n}</div>
            <div className="text-xs text-muted-foreground">{l}</div>
          </div>
        ))}
      </div>
      <ul className="mt-6 space-y-3">
        {v.length === 0 && <li className="rounded-2xl border bg-card p-5 text-sm text-muted-foreground">Nessun locale registrato.</li>}
        {v.map((x) => (
          <li key={x.id} className="rounded-2xl border bg-card">
            <button type="button" className="flex w-full items-center justify-between gap-3 p-4 text-left" aria-expanded={open === x.id} onClick={() => setOpen(open === x.id ? null : x.id)}>
              <div className="min-w-0">
                <div className="truncate font-semibold">{x.name}</div>
                <div className="truncate text-xs text-muted-foreground">{x.owner_email} · iscritto il {new Date(x.created_at).toLocaleDateString("it-IT")}</div>
                <div className="mt-1 text-xs text-muted-foreground">{x.cards_count} clienti · {x.rewards_total} premi · {x.staff_count} collaboratori</div>
              </div>
              <ChevronDown className={`size-5 shrink-0 transition-transform ${open === x.id ? "rotate-180" : ""}`} />
            </button>
            {open === x.id && <StaffPanel venueId={x.id} />}
          </li>
        ))}
      </ul>
    </main>
  );
}


function CreateManagerPanel() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.functions.invoke("admin-create-manager", {
      body: { email: email.trim().toLowerCase(), name: name.trim() },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message || "Impossibile inviare l'invito");
      return;
    }
    setEmail("");
    setName("");
    toast.success("Invito inviato: il gestore riceverà un'email per attivare l'account.");
  }

  return (
    <section className="mt-6 rounded-3xl border bg-card p-5 shadow-soft">
      <h2 className="flex items-center gap-2 text-xl font-semibold"><UserPlus className="size-5" /> Crea un gestore</h2>
      <p className="mt-1 text-sm text-muted-foreground">Inserisci l'email del titolare. Riceverà un invito per attivare l'account e configurare il proprio locale.</p>
      <form onSubmit={create} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <Input type="text" maxLength={80} placeholder="Nome gestore (facoltativo)" value={name} onChange={(e) => setName(e.target.value)} aria-label="Nome gestore" />
        <Input type="email" required placeholder="email@esempio.it" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email nuovo gestore" />
        <Button disabled={busy}><UserPlus /> {busy ? "Invio…" : "Invia invito"}</Button>
      </form>
    </section>
  );
}

function StaffPanel({ venueId }: { venueId: string }) {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const q = useQuery({
    queryKey: ["admin-staff", venueId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_venue_staff", { _venue: venueId });
      if (error) throw error;
      return data ?? [];
    },
  });
  function refresh() {
    qc.invalidateQueries({ queryKey: ["admin-staff", venueId] });
    qc.invalidateQueries({ queryKey: ["admin-venues"] });
  }
  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.rpc("admin_add_staff", { _venue: venueId, _email: email });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    window.__lovableEvents?.track?.("project.staff_invited", {});
    setEmail("");
    toast.success("Collaboratore aggiunto");
    refresh();
  }
  async function remove(id: string) {
    const { error } = await supabase.rpc("admin_remove_staff", { _id: id });
    if (error) { toast.error(error.message); return; }
    refresh();
  }
  return (
    <div className="border-t p-4">
      <h3 className="flex items-center gap-2 font-semibold"><Users className="size-4" /> Collaboratori</h3>
      <p className="mt-1 text-xs text-muted-foreground">Aggiungi un account già creato dall’amministratore.</p>
      <form onSubmit={add} className="mt-3 flex gap-2">
        <Input type="email" required placeholder="email@esempio.it" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email collaboratore" />
        <Button disabled={busy}>Aggiungi</Button>
      </form>
      <ul className="mt-3 divide-y">
        {(q.data ?? []).length === 0 && !q.isLoading && <li className="py-2 text-sm text-muted-foreground">Nessun collaboratore.</li>}
        {(q.data ?? []).map((s) => (
          <li key={s.id} className="flex items-center justify-between py-2 text-sm">
            {s.email}
            <Button variant="ghost" size="icon" aria-label={`Rimuovi ${s.email}`} onClick={() => remove(s.id)}><Trash2 /></Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
