import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { Gift, Smartphone, History, Percent, CalendarDays, Bell, BellOff } from "lucide-react";
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
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">("default");
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const previousSnapshot = useRef<{ stamps: number; rewardIds: Set<string> } | null>(null);
  useEffect(() => {
    setUrl(window.location.href);
    setNotificationPermission("Notification" in window ? Notification.permission : "unsupported");
    setNotificationsEnabled(window.localStorage.getItem("timbrino-notifications-" + token) === "enabled");
  }, [token]);

  async function enableNotifications() {
    if (!("Notification" in window)) {
      setNotificationPermission("unsupported");
      return;
    }
    const permission = Notification.permission === "default"
      ? await Notification.requestPermission()
      : Notification.permission;
    setNotificationPermission(permission);
    if (permission === "granted") {
      window.localStorage.setItem("timbrino-notifications-" + token, "enabled");
      setNotificationsEnabled(true);
    }
  }

  useEffect(() => {
    const card = q.data;
    if (!card) return;
    const rewardIds = new Set<string>((card.rewards_history ?? []).map((reward: { id: string }) => reward.id));
    const previous = previousSnapshot.current;
    if (previous && notificationsEnabled && notificationPermission === "granted") {
      const newReward = (card.rewards_history ?? []).find((reward: { id: string }) => !previous.rewardIds.has(reward.id));
      if (newReward) {
        new Notification("Hai ricevuto un premio!", {
          body: newReward.description,
          tag: "reward-" + newReward.id,
          icon: card.card_logo_url || undefined,
        });
      } else if (
        previous.stamps < card.stamps_required - 1 &&
        card.stamps >= card.stamps_required - 1 &&
        card.stamps < card.stamps_required
      ) {
        new Notification("Ti manca un solo timbro!", {
          body: "Sei a " + card.stamps + "/" + card.stamps_required + " timbri da " + card.venue_name + ".",
          tag: "almost-complete-" + token,
        });
      }
    }
    previousSnapshot.current = { stamps: card.stamps, rewardIds };
  }, [q.data, notificationsEnabled, notificationPermission, token]);

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

      <section className="mt-5 rounded-2xl border bg-card p-4">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {notificationsEnabled ? <Bell className="size-4" /> : <BellOff className="size-4" />}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold">Avvisi sulla tua raccolta</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Ricevi un avviso quando ti viene assegnato un premio o quando ti manca un solo timbro.
              Gli avvisi funzionano mentre questa carta è aperta; non sono notifiche in background.
            </p>
            {notificationPermission === "unsupported" ? (
              <p className="mt-2 text-xs text-muted-foreground">Questo browser non supporta le notifiche.</p>
            ) : notificationPermission === "denied" ? (
              <p className="mt-2 text-xs text-muted-foreground">Notifiche bloccate dal browser. Puoi abilitarle dalle impostazioni del sito.</p>
            ) : notificationsEnabled && notificationPermission === "granted" ? (
              <p className="mt-2 text-xs font-medium text-primary">Notifiche attive su questo dispositivo.</p>
            ) : (
              <button type="button" onClick={() => void enableNotifications()} className="mt-3 inline-flex min-h-10 items-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">
                Attiva notifiche
              </button>
            )}
          </div>
        </div>
      </section>

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
