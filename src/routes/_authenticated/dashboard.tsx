import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { ScanLine, LogOut, Copy, Printer, Users, Gift, Award, QrCode, ArrowUpRight, Sparkles } from "lucide-react";
import { CustomerSearch } from "@/components/CustomerSearch";
import { BrandLogo } from "@/components/BrandLogo";
import { CardAppearanceEditor } from "@/components/CardAppearanceEditor";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

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
      const [staff, admin, access] = await Promise.all([
        supabase.rpc("my_staff_venue"),
        supabase.from("user_roles").select("role").eq("role", "admin").maybeSingle(),
        supabase.from("manager_access").select("user_id").maybeSingle(),
      ]);
      if (staff.error) throw staff.error;
      if (admin.error || access.error) throw admin.error ?? access.error;
      return { staffVenue: staff.data?.[0] ?? null, isAdmin: !!admin.data, authorized: !!access.data };
    },
  });

  useEffect(() => {
    if (extraQ.data?.isAdmin) void navigate({ to: "/admin", replace: true });
  }, [extraQ.data?.isAdmin, navigate]);

  if (extraQ.data?.isAdmin || loading || !user || venueQ.isLoading || extraQ.isLoading) return <div className="p-10 text-center text-muted-foreground">Caricamento…</div>;
  if (venueQ.isError || extraQ.isError) return <div className="p-10 text-center"><p>Impossibile caricare il locale.</p><Button onClick={() => { void venueQ.refetch(); void extraQ.refetch(); }} className="mt-4">Riprova</Button></div>;

  return (
    <main className="mx-auto max-w-5xl px-5 py-8 sm:px-6 lg:px-8">
      <header className="flex items-center justify-between border-b border-border/60 pb-5">
        <BrandLogo className="text-accent" />
        <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground hover:text-foreground"><LogOut className="mr-1 size-4" /> Esci</Button>
      </header>
      {venueQ.data ? <VenueView venue={venueQ.data} /> : extraQ.data?.staffVenue ? <StaffView name={extraQ.data.staffVenue.name} /> : extraQ.data?.authorized ? <CreateVenue userId={user.id} /> : <p className="mt-8">Account non autorizzato. Contatta l’amministratore per ricevere un invito.</p>}
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
    try {
    const slug = `${slugify(name) || "locale"}-${Math.random().toString(36).slice(2, 6)}`;
    const { error } = await supabase.from("venues").insert({ name: name.trim(), slug, owner_id: userId, stamps_required: stampsRequired });
    if (error) { toast.error("Impossibile creare il locale"); return; }
    qc.invalidateQueries({ queryKey: ["venue"] });
    } catch { toast.error("Connessione non disponibile. Riprova."); }
    finally { setBusy(false); }
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

type Venue = { id: string; name: string; slug: string; stamps_required: number; card_primary_color: string; card_secondary_color: string; card_logo_url: string | null; card_tagline: string; card_stamp_icon: string };

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
    <div className="mt-8 space-y-7">
      <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="size-3.5" /> Area gestione
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{venue.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">La panoramica della tua attività e del programma fedeltà.</p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-xl border bg-card px-3 py-2 text-sm text-muted-foreground">
          <Award className="size-4 text-primary" />
          <span><strong className="text-foreground">{venue.stamps_required}</strong> timbri per un premio</span>
        </div>
      </section>

      <Button asChild variant="accent" size="lg" className="h-14 w-full justify-between rounded-2xl px-5 text-base shadow-soft sm:w-auto sm:min-w-72">
        <Link to="/scan"><span className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-xl bg-white/15"><ScanLine className="size-5" /></span> Scansiona carta cliente</span><ArrowUpRight className="size-5 opacity-80" /></Link>
      </Button>

      <section aria-label="Statistiche del locale">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">La tua attività</h2>
          <span className="text-xs text-muted-foreground">Dati aggiornati in tempo reale</span>
        </div>
        {cardsQ.isPending ? (
          <p className="rounded-2xl border bg-card p-5 text-center text-sm text-muted-foreground">Caricamento statistiche…</p>
        ) : cardsQ.isError ? (
          <div className="rounded-2xl border bg-card p-5 text-center">
            <p>Impossibile caricare le statistiche.</p>
            <Button variant="outline" className="mt-3" onClick={() => void cardsQ.refetch()}>Riprova</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {([
              { label: "Clienti iscritti", value: cardsQ.data.customers, icon: Users, note: "Carte create" },
              { label: "Premi da ritirare", value: cardsQ.data.ready, icon: Gift, note: "Carte con premio disponibile" },
              { label: "Premi consegnati", value: cardsQ.data.rewards, icon: Award, note: "Premi riscattati" },
            ] as const).map(({ label, value, icon: Icon, note }) => (
              <div key={label} className="group rounded-2xl border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">{label}</span>
                  <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="size-4" /></span>
                </div>
                <div className="mt-4 font-display text-3xl font-bold tracking-tight tabular-nums">{value}</div>
                <p className="mt-1 text-xs text-muted-foreground">{note}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <AdvancedAnalytics venue={venue} />

      <section className="grid items-start gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><QrCode className="size-5" /></span>
            <div>
              <h2 className="text-lg font-semibold">QR code del locale</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Mettilo sul bancone: i clienti potranno iscriversi alla tua raccolta punti.</p>
            </div>
          </div>
          <div className="mt-5 flex flex-col items-center rounded-2xl bg-muted/50 p-5">
            {origin && <div className="rounded-2xl bg-white p-3 shadow-sm"><QRCodeSVG id="venue-qr" value={joinUrl} size={176} bgColor="#ffffff" /></div>}
            <p className="mt-3 text-center text-xs text-muted-foreground">Inquadra per creare la carta fedeltà</p>
          </div>
          <div className="mt-4 min-w-0">
            <p className="break-all rounded-xl border bg-background px-3 py-2.5 text-xs text-muted-foreground">{joinUrl}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(joinUrl); toast.success("Link copiato"); }}>
                <Copy className="mr-1 size-4" /> Copia link
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                const svg = document.getElementById("venue-qr")?.outerHTML;
                const w = window.open("", "_blank");
                if (!svg || !w) { toast.error("Impossibile aprire la stampa. Consenti le finestre popup."); return; }
                w.document.write(`<!doctype html><html lang="it"><head><title>QR Timbrino</title><style>body{font-family:sans-serif;text-align:center;padding:48px}svg{width:320px;height:320px}h1{font-size:32px}</style></head><body><h1>Raccogli i timbri!</h1><p>Inquadra il codice per ricevere la tua carta fedeltà.</p>${svg}<p style="font-size:12px">${joinUrl}</p></body></html>`);
                w.document.close(); w.focus(); w.print();
              }}>
                <Printer className="mr-1 size-4" /> Stampa QR
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Sparkles className="size-5" /></span>
            <div>
              <h2 className="text-lg font-semibold">Personalizza la tua carta</h2>
              <p className="text-sm text-muted-foreground">Rendila riconoscibile con i colori e il logo del locale.</p>
            </div>
          </div>
          <CardAppearanceEditor venue={venue} />
        </div>
      </section>

      <section className="border-t pt-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">I tuoi clienti</h2>
          <p className="mt-1 text-sm text-muted-foreground">Cerca una carta o consulta i progressi dei clienti.</p>
        </div>
        <CustomerSearch />
      </section>
    </div>
  );
}


function AdvancedAnalytics({ venue }: { venue: Venue }) {
  const [period, setPeriod] = useState<7 | 30 | 90>(30);
  const analyticsQ = useQuery({
    queryKey: ["venue-advanced-analytics", venue.id],
    queryFn: async () => {
      const [cardsResult, rewardsResult] = await Promise.all([
        supabase.from("cards").select("id, customer_name, stamps, rewards_count, created_at").eq("venue_id", venue.id).order("created_at", { ascending: false }).limit(10000),
        supabase.from("rewards").select("id, description, kind, card_id, created_at").eq("venue_id", venue.id).order("created_at", { ascending: false }).limit(10000),
      ]);
      if (cardsResult.error) throw cardsResult.error;
      if (rewardsResult.error) throw rewardsResult.error;
      return { cards: cardsResult.data ?? [], rewards: rewardsResult.data ?? [] };
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
  const analytics = useMemo(() => {
    const start = new Date();
    start.setDate(start.getDate() - (period - 1));
    start.setHours(0, 0, 0, 0);
    const keyOf = (date: Date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
    const buckets = new Map<string, number>();
    for (let i = 0; i < period; i += 1) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      buckets.set(keyOf(day), 0);
    }
    const cards = analyticsQ.data?.cards ?? [];
    const rewards = analyticsQ.data?.rewards ?? [];
    for (const card of cards) {
      const key = keyOf(new Date(card.created_at));
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    const newCustomers = Array.from(buckets, ([date, count]) => ({
      date,
      label: new Date(date + "T12:00:00").toLocaleDateString("it-IT", { day: "numeric", month: "short" }),
      count,
    }));
    const topCustomers = cards.map((card) => ({
      id: card.id,
      name: card.customer_name,
      stamps: card.stamps,
      rewards: card.rewards_count,
      score: card.stamps + card.rewards_count * venue.stamps_required,
    })).filter((customer) => customer.score > 0)
      .sort((a, b) => b.score - a.score || b.rewards - a.rewards || b.stamps - a.stamps).slice(0, 5);
    const rewardCounts = new Map<string, { description: string; kind: string; count: number }>();
    for (const reward of rewards) {
      const key = reward.kind + "|" + reward.description.trim().toLocaleLowerCase("it");
      const current = rewardCounts.get(key);
      if (current) current.count += 1;
      else rewardCounts.set(key, { description: reward.description, kind: reward.kind, count: 1 });
    }
    return {
      newCustomers,
      periodTotal: newCustomers.reduce((sum, item) => sum + item.count, 0),
      topCustomers,
      popularRewards: Array.from(rewardCounts.values()).sort((a, b) => b.count - a.count).slice(0, 5),
    };
  }, [analyticsQ.data, period, venue.stamps_required]);

  return (
    <section className="space-y-4 rounded-3xl border bg-card p-5 shadow-sm sm:p-6" aria-label="Statistiche avanzate">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Statistiche avanzate</h2>
          <p className="mt-1 text-sm text-muted-foreground">Scopri come cresce la tua raccolta fedeltà.</p>
        </div>
        <div className="inline-flex w-fit rounded-xl border bg-muted/40 p-1" aria-label="Periodo statistiche">
          {[7, 30, 90].map((days) => (
            <button key={days} type="button" onClick={() => setPeriod(days as 7 | 30 | 90)} aria-pressed={period === days}
              className={"rounded-lg px-3 py-2 text-xs font-medium transition-colors " + (period === days ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              {days} giorni
            </button>
          ))}
        </div>
      </div>
      {analyticsQ.isPending ? (
        <p className="rounded-2xl bg-muted/40 p-6 text-center text-sm text-muted-foreground">Caricamento statistiche avanzate…</p>
      ) : analyticsQ.isError ? (
        <div className="rounded-2xl bg-muted/40 p-6 text-center">
          <p className="text-sm">Non è stato possibile caricare le statistiche avanzate.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => void analyticsQ.refetch()}>Riprova</Button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
            <div className="min-w-0 rounded-2xl border bg-background p-4">
              <p className="text-sm font-medium">Nuovi clienti</p>
              <p className="mt-1 font-display text-2xl font-bold tabular-nums">{analytics.periodTotal}</p>
              <p className="text-xs text-muted-foreground">Iscrizioni negli ultimi {period} giorni</p>
              {analytics.periodTotal === 0 ? (
                <p className="mt-8 rounded-xl bg-muted/40 p-5 text-center text-sm text-muted-foreground">Non ci sono nuove iscrizioni in questo periodo.</p>
              ) : (
                <div className="mt-4 h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.newCustomers} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} interval={period === 90 ? 13 : period === 30 ? 4 : 0} tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" name="Nuovi clienti" fill="hsl(var(--primary))" radius={[5, 5, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
            <div className="rounded-2xl border bg-background p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">Clienti più attivi</p>
                  <p className="mt-1 text-xs text-muted-foreground">Timbri attuali + timbri dei premi già ottenuti</p>
                </div>
                <Users className="size-5 shrink-0 text-primary" />
              </div>
              {analytics.topCustomers.length ? (
                <ol className="mt-4 space-y-3">
                  {analytics.topCustomers.map((customer, index) => (
                    <li key={customer.id} className="flex items-center gap-3">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{customer.name}</p>
                        <p className="text-xs text-muted-foreground">{customer.stamps} timbri attuali · {customer.rewards} premi</p>
                      </div>
                      <span className="text-sm font-semibold tabular-nums">{customer.score}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-5 rounded-xl bg-muted/40 p-5 text-center text-sm text-muted-foreground">I clienti compariranno qui quando inizieranno a raccogliere timbri.</p>
              )}
            </div>
          </div>
          <div className="rounded-2xl border bg-background p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">Premi più richiesti</p>
                <p className="mt-1 text-xs text-muted-foreground">Classifica in base ai premi effettivamente consegnati</p>
              </div>
              <Gift className="size-5 text-primary" />
            </div>
            {analytics.popularRewards.length ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {analytics.popularRewards.map((reward) => (
                  <div key={reward.kind + reward.description} className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{reward.description}</p>
                      <p className="text-xs text-muted-foreground">{reward.kind === "discount" ? "Sconto" : "Omaggio"}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{reward.count} {reward.count === 1 ? "volta" : "volte"}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-xl bg-muted/40 p-5 text-center text-sm text-muted-foreground">Non sono ancora stati consegnati premi.</p>
            )}
          </div>
        </>
      )}
    </section>
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
