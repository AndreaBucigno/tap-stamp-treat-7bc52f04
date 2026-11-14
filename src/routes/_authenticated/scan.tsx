import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardResult, type CardResultData } from "@/components/CardResult";
import { cardToken, validStampResult } from "@/lib/loyalty";

const QrScanner = lazy(() => import("@/components/QrScanner"));

export const Route = createFileRoute("/_authenticated/scan")({
  head: () => ({
    meta: [
      { title: "Scansiona carta — Timbrino" },
      { name: "description", content: "Scansiona la carta del cliente per aggiungere un timbro." },
      { property: "og:title", content: "Scansiona carta — Timbrino" },
      { property: "og:description", content: "Aggiungi timbri alle carte dei clienti." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ScanPage,
});

type Result = CardResultData;

function ScanPage() {
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [manual, setManual] = useState("");
  const [cameraError, setCameraError] = useState(false);
  const inFlight = useRef(false);
  useEffect(() => setMounted(true), []);

  async function handle(text: string, source: "camera" | "manual") {
    if (inFlight.current || result) return;
    const token = cardToken(text);
    if (!token) { toast.error("QR non riconosciuto"); return; }
    setBusy(true);
    inFlight.current = true;
    try {
    if (source === "manual") {
      window.__lovableEvents?.track?.("project.card_code_entered", {});
    } else {
      // Count a recognized QR scan even when the stamp is blocked by cooldown or card state.
      window.__lovableEvents?.track?.("project.card_scanned", {});
    }
    const { data, error } = await supabase.rpc("add_stamp", { _token: token });
    if (error) {
      if (error.message.includes("Premio già raggiunto")) {
        const { data: card, error: cardError } = await supabase.rpc("get_card", { _token: token });
        const c = card?.[0];
        if (!cardError && validStampResult(c)) {
          setResult({ token, name: c.customer_name, stamps: c.stamps, required: c.stamps_required, full: true, justStamped: false });
        } else toast.error("Impossibile caricare la carta completa. Riprova.");
      } else toast.error(error.message);
    } else if (validStampResult(data?.[0])) {
      const r = data[0];
      window.__lovableEvents?.track?.("project.stamp_added", { source });
      setResult({ token, name: r.customer_name, stamps: r.stamps, required: r.stamps_required, full: r.stamps >= r.stamps_required, justStamped: true });
    } else toast.error("Timbro non confermato. Controlla la carta prima di riprovare.");
    } catch { toast.error("Connessione non disponibile. Riprova."); }
    finally { setBusy(false); inFlight.current = false; }
  }

  return (
    <main className="mx-auto max-w-md px-5 py-6">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> Torna al locale</Link>
      <h1 className="mt-4 text-3xl font-bold">Scansiona la carta</h1>
      {!result ? (
        <div className="mt-5">
          {mounted && !cameraError && (
            <Suspense fallback={<div className="h-full rounded-3xl bg-muted" />}>
              <QrScanner onScan={(t) => handle(t, "camera")} paused={busy} onError={() => setCameraError(true)} />
            </Suspense>
          )}
          {cameraError ? <p className="rounded-xl bg-secondary p-4 text-sm">Fotocamera non disponibile. Consenti l’accesso alla fotocamera oppure inserisci il link della carta.</p> : <p className="mt-3 text-center text-sm text-muted-foreground">Inquadra il QR sul telefono del cliente</p>}
          <form className="mt-6 space-y-3" onSubmit={(e) => { e.preventDefault(); void handle(manual, "manual"); }}>
            <label htmlFor="card-link" className="text-sm font-medium">Link o codice della carta</label>
            <Input id="card-link" value={manual} onChange={(e) => setManual(e.target.value)} required />
            <Button disabled={busy || !manual.trim()} className="w-full">{busy ? "Registrazione…" : "Aggiungi timbro"}</Button>
          </form>
        </div>
      ) : (
        <div className="mt-5"><CardResult r={result} doneLabel="Scansiona un'altra carta" onDone={() => { setResult(null); setManual(""); }} /></div>
      )}
    </main>
  );
}

