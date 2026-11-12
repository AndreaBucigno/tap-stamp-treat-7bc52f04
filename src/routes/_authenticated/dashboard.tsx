import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { ScanLine, LogOut, Copy } from "lucide-react";
import { CustomerSearch } from "@/components/CustomerSearch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Il mio locale — Timbrino" },
      { name: "description", content: "Gestisci le carte fedeltà del tuo locale." },
      { property: "og:title", content: "Il mio locale — Timbrino" },
      { property: "og:description", content: "Gestisci le carte fedeltà del tuo locale." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40);
}

function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    await navigate({ to: "/auth", replace: true });
  }

  const venueQ = useQuery({
    queryKey: ["venue", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("venues").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const extraQ = useQuery({
    queryKey: ["role-extra", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [staff, admin] = await Promise.all([
        supabase.rpc("my_staff_venue"),
        supabase.from("user_roles").select("role").eq("role", "admin").maybeSingle(),
      ]);
      if (staff.error) throw staff.error;
      return { staffVenue: staff.data?.[0] ?? null, isAdmin: !!admin.data };
    },
  });

  useEffect(() => {
    if (extraQ.data?.isAdmin) void navigate({ to: "/admin", replace: true });
  }, [extraQ.data?.isAdmin, navigate]);

  if (extraQ.data?.isAdmin || loading || !user || venueQ.isLoading || extraQ.isLoading) return <div className="p-10 text-center text-muted-foreground">Caricamento…</div>;
  if (venueQ.isError) return <div className="p-10 text-center"><p>Impossibile caricare il locale.</p><Button onClick={() => venueQ.refetch()} className="mt-4">Riprova</Button></div>;

  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <header className="flex items-center justify-between">
        <Link to="/" className="font-display text-xl text-accent">Timbrino</Link>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={signOut}><LogOut /> Esci</Button>
        </div>
      </header>
      {venueQ.data ? <VenueView venue={venueQ.data} /> : extraQ.data?.staffVenue ? <StaffView name={extraQ.data.staffVenue.name} /> : <CreateVenue userId={user.id} />}
    </main>
  );
}

function CreateVenue({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [stampsRequired, setStampsRequired] = useState<5 | 10>(10);
  const [busy, setBusy] = useState(false);
  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const slug = `${slugify(name) || "locale"}-${Math.random().toString(36).slice(2, 6)}`;
    const { error } = await supabase.from("venues").insert({ name: name.trim(), slug, owner_id: userId, stamps_required: stampsRequired });
    setBusy(false);
    if (error) { toast.error("Impossibile creare il locale"); return; }
    qc.invalidateQueries({ queryKey: ["venue"] });
  }
  return (
    <form onSubmit={create} className="mt-12 rounded-3xl border bg-card p-7 shadow-soft">
      <h1 className="text-3xl font-bold">Come si chiama il tuo locale?</h1>
      <p className="mt-2 text-muted-foreground">Comparirà sulle carte dei tuoi clienti.</p>
      <Input className="mt-6" required maxLength={60} placeholder="Es. Bar Centrale" value={name} onChange={(e) => setName(e.target.value)} />
      <fieldset className="mt-6 space-y-3">
        <legend className="text-sm font-medium">Da quanti timbri è composta la carta?</legend>
        <p className="text-sm text-muted-foreground">Scegli quanti timbri servono al cliente per ottenere un premio.</p>
        <div className="grid grid-cols-2 gap-3">
          {[5, 10].map((count) => (
            <button
              key={count}
              type="button"
              aria-pressed={stampsRequired === count}
              onClick={() => setStampsRequired(count as 5 | 10)}
              className={`rounded-xl border p-4 text-center transition-colors ${stampsRequired === count ? "border-primary bg-primary/10 text-primary" : "border-input bg-background hover:bg-muted"}`}
            >
              <span className="block text-2xl font-bold">{count}</span>
              <span className="text-sm">timbri</span>
            </button>
          ))}
        </div>
      </fieldset>
      <Button disabled={busy} variant="accent" className="mt-6 w-full" size="lg">Crea locale</Button>
    </form>
  );
}

type Venue = { id: string; name: string; slug: string; stamps_required: number };

function VenueView({ venue }: { venue: Venue }) {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const joinUrl = `${origin}/join/${venue.slug}`;

  const cardsQ = useQuery({
    queryKey: ["cards", venue.id],
    queryFn: async () => {
      const [customersQ, readyQ, rewardsQ] = await Promise.all([
        supabase.from("cards").select("id", { count: "exact", head: true }).eq("venue_id", venue.id),
        supabase.from("cards").select("id", { count: "exact", head: true }).eq("venue_id", venue.id).gte("stamps", venue.stamps_required),
        supabase.from("rewards").select("id", { count: "exact", head: true }).eq("venue_id", venue.id),
      ]);
      if (customersQ.error) throw customersQ.error;
      if (readyQ.error) throw readyQ.error;
      if (rewardsQ.error) throw rewardsQ.error;
      if (customersQ.count === null || readyQ.count === null || rewardsQ.count === null) {
        throw new Error("Impossibile caricare i conteggi del locale.");
      }
      return { customers: customersQ.count, ready: readyQ.count, rewards: rewardsQ.count };
    },
  });

  return (
    <div className="mt-8 space-y-6">
      <div>
        <h1 className="text-4xl font-bold">{venue.name}</h1>
        <p className="mt-1 text-muted-foreground">{venue.stamps_required} timbri per un premio</p>
      </div>

      <Button asChild variant="accent" size="lg" className="h-14 w-full text-base">
        <Link to="/scan"><ScanLine className="!size-5" /> Scansiona carta cliente</Link>
      </Button>

      {cardsQ.isPending ? (
        <p className="text-center text-sm text-muted-foreground">Caricamento statistiche…</p>
      ) : cardsQ.isError ? (
        <div className="rounded-2xl border bg-card p-4 text-center">
          <p>Impossibile caricare le statistiche.</p>
          <Button variant="outline" className="mt-3" onClick={() => void cardsQ.refetch()}>Riprova</Button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {([["Clienti", cardsQ.data.customers], ["Premi pronti", cardsQ.data.ready], ["Premi dati", cardsQ.data.rewards]] as const).map(([l, v]) => (
            <div key={l} className="rounded-2xl border bg-card p-4 text-center">
              <div className="font-display text-3xl font-bold">{v}</div>
              <div className="text-xs text-muted-foreground">{l}</div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-3xl border bg-card p-6 shadow-soft">
        <h2 className="text-2xl font-semibold">QR da esporre al bancone</h2>
        <p className="mt-1 text-sm text-muted-foreground">I clienti lo inquadrano per ricevere la loro carta fedeltà.</p>
        <div className="mt-5 flex flex-col items-center gap-4 sm:flex-row">
          {origin && <div className="rounded-2xl bg-background p-4"><QRCodeSVG value={joinUrl} size={160} bgColor="transparent" /></div>}
          <div className="w-full min-w-0 flex-1">
            <p className="break-all rounded-xl bg-muted p-3 text-xs">{joinUrl}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => { navigator.clipboard.writeText(joinUrl); toast.success("Link copiato"); }}>
              <Copy /> Copia link
            </Button>
          </div>
        </div>
      </div>

      <CustomerSearch />
    </div>
  );
}

function StaffView({ name }: { name: string }) {
  return (
    <div className="mt-10 space-y-6 text-center">
      <p className="text-sm text-muted-foreground">Collaboratore di</p>
      <h1 className="text-4xl font-bold">{name}</h1>
      <Button asChild variant="accent" size="lg" className="h-14 w-full text-base">
        <Link to="/scan"><ScanLine className="!size-5" /> Scansiona tessera cliente</Link>
      </Button>
      <div className="text-left"><CustomerSearch /></div>
    </div>
  );
}
