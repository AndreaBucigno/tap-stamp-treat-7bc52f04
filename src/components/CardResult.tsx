import { useState, useRef } from "react";
import { Gift, Percent, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StampGrid } from "@/components/StampGrid";
import { cn } from "@/lib/utils";
import { rewardDescription } from "@/lib/loyalty";

export type CardResultData = { token: string; name: string; stamps: number; required: number; full: boolean; justStamped: boolean };

export function CardResult({ r, onDone, doneLabel }: { r: CardResultData; onDone: () => void; doneLabel: string }) {
  const redeeming = useRef(false);
  const [kind, setKind] = useState<"gift" | "discount">("gift");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);

  async function redeem() {
    if (redeeming.current) return;
    const description = rewardDescription(kind, desc);
    if (!description) { toast.error("Inserisci un premio o una percentuale tra 1 e 100."); return; }
    redeeming.current = true;
    setBusy(true);
    try {
    const { error } = await supabase.rpc("redeem_reward", { _token: r.token, _kind: kind, _description: description });

    if (error) { toast.error(error.message); return; }
    window.__lovableEvents?.track?.("project.reward_given", { kind });
    toast.success(`Premio consegnato a ${r.name}!`);
    onDone();
    } catch { toast.error("Connessione non disponibile. Riprova."); }
    finally { redeeming.current = false; setBusy(false); }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border bg-card p-6 shadow-soft">
        {r.justStamped && <p className="flex items-center gap-2 text-sm font-medium text-accent"><Check className="size-4" /> Timbro aggiunto</p>}
        <h2 className="mt-1 text-2xl font-bold">{r.name}</h2>
        <p className="text-muted-foreground">{r.stamps} di {r.required} timbri</p>
        <div className="mt-5"><StampGrid stamps={r.stamps} total={r.required} /></div>
      </div>
      {r.full && (
        <div className="rounded-3xl loyalty-card p-6">
          <h3 className="text-2xl font-bold">Carta completa! Cosa regali?</h3>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {([["gift", Gift, "Omaggio"], ["discount", Percent, "Sconto %"]] as const).map(([k, Icon, l]) => (
              <Button key={k} type="button" variant="ghost" aria-pressed={kind === k} onClick={() => { setKind(k); setDesc(""); }}
                className={cn("flex items-center justify-center gap-2 rounded-2xl border-2 p-3 font-medium", kind === k ? "border-accent bg-accent text-accent-foreground" : "border-primary-foreground/25")}>
                <Icon className="size-4" /> {l}
              </Button>
            ))}
          </div>
          <Input className="mt-3 bg-card text-card-foreground" value={desc} onChange={(e) => setDesc(e.target.value)}
            maxLength={500} type={kind === "discount" ? "number" : "text"} min={1} max={100}
            placeholder={kind === "discount" ? "Percentuale, es. 20" : "Es. Un cappuccino e cornetto"} />
          <Button disabled={busy || !rewardDescription(kind, desc)} onClick={redeem} variant="accent" size="lg" className="mt-4 h-auto min-h-10 w-full whitespace-normal">Consegna premio e azzera carta</Button>
        </div>
      )}
      <Button variant="outline" className="w-full rounded-full" onClick={onDone}>{doneLabel}</Button>
    </div>
  );
}
