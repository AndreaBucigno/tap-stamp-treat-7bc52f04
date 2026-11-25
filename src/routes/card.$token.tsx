import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { Gift, Smartphone, History, Percent, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StampGrid } from "@/components/StampGrid";

export const Route = createFileRoute("/card/$token")({
  head: () => ({
    meta: [
      { title: "La mia carta fedeltà — Timbrino" },
      { name: "description", content: "Mostra questa carta al bancone ad ogni acquisto." },
      { property: "og:title", content: "La mia carta fedeltà" },
      { property: "og:description", content: "Mostra il QR al bancone ad ogni acquisto." },
      { name: "robots", content: "noindex" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CardPage,
});

function CardPage() {
  const { token } = Route.useParams();
  const [url, setUrl] = useState("");
  useEffect(() => setUrl(window.location.href), []);

  const q = useQuery({
    queryKey: ["card", token],
    refetchInterval: 5000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_card_with_rewards", { _token: token });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  if (q.isLoading) return <div className="p-10 text-center text-muted-foreground">Caricamento…</div>;
  if (q.isError) return <div className="p-10 text-center">Impossibile caricare la carta. Controlla la connessione e riapri il link.</div>;
  const c = q.data;
  if (!c) return <div className="p-10 text-center">Carta non trovata.</div>;
  const complete = c.stamps >= c.stamps_required;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col px-5 py-8">
      <div className="rounded-3xl p-6 shadow-soft" style={{ backgroundColor: c.card_primary_color || "#174F3C", color: c.card_secondary_color || "#F5EBD7" }}>
        <div className="flex items-start justify-between">
          <div>
            {c.card_logo_url && <img src={c.card_logo_url} alt={`Logo di ${c.venue_name}`} className="mb-3 size-12 rounded-xl bg-white/90 object-contain p-1" />}
            <p className="text-xs uppercase tracking-widest opacity-70">Carta fedeltà</p>
            <h1 className="mt-1 text-2xl font-bold">{c.venue_name}</h1>
          </div>
          <span className="font-display text-3xl font-bold">{c.stamps}<span className="text-base opacity-60">/{c.stamps_required}</span></span>
        </div>
        <div className="mt-6"><StampGrid stamps={c.stamps} total={c.stamps_required} light stampColor={c.card_secondary_color || "#F5EBD7"} stampIcon={c.card_stamp_icon || "gift"} /></div>
        <p className="mt-5 text-sm opacity-80">{c.customer_name}</p>
        <p className="mt-2 text-xs opacity-75">{c.card_tagline || "Raccogli timbri e ricevi premi"}</p>
      </div>

      {complete && (
        <div className="mt-5 flex items-center gap-3 rounded-2xl bg-accent p-4 text-accent-foreground">
          <Gift className="size-6 shrink-0" />
          <p className="text-sm font-medium">Hai completato la carta! Mostrala al bancone per ricevere il tuo premio.</p>
        </div>
      )}

      <div className="mt-6 flex flex-col items-center rounded-3xl border bg-card p-6 shadow-soft">
        {url && <QRCodeSVG value={url} size={200} bgColor="transparent" fgColor="currentColor" className="text-foreground" />}
        <p className="mt-4 text-center text-sm text-muted-foreground">Mostra questo QR al barista ad ogni acquisto</p>
      </div>

      <section className="mt-6 rounded-3xl border bg-card p-5 shadow-soft">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><History className="size-5" /></span>
          <div>
            <h2 className="font-semibold">I tuoi premi</h2>
            <p className="text-xs text-muted-foreground">Lo storico dei premi che hai ricevuto</p>
          </div>
        </div>
        {c.rewards_history?.length ? (
          <div className="mt-4 space-y-3">
            {c.rewards_history.map((reward) => (
              <div key={reward.id} className="flex items-start gap-3 rounded-2xl bg-muted/50 p-3">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-background text-primary">
                  {reward.kind === "discount" ? <Percent className="size-4" /> : <Gift className="size-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{reward.description}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays className="size-3.5" />
                    {new Date(reward.created_at).toLocaleString("it-IT", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">Ricevuto</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-2xl bg-muted/50 p-4 text-sm text-muted-foreground">Non hai ancora ricevuto premi. Continua a raccogliere timbri: qui compariranno i tuoi premi!</p>
        )}
      </section>

      <div className="mt-6 flex gap-3 rounded-2xl bg-secondary p-4 text-sm text-secondary-foreground">
        <Smartphone className="size-5 shrink-0" />
        <p>Salvala sul telefono: tocca <b>Condividi</b> → <b>Aggiungi alla schermata Home</b>.</p>
      </div>
      {c.rewards_count > 0 && <p className="mt-4 text-center text-xs text-muted-foreground">Premi ricevuti finora: {c.rewards_count}</p>}
    </main>
  );
}
