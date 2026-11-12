import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Gift } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardResult, type CardResultData } from "@/components/CardResult";

export function CustomerSearch() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [result, setResult] = useState<CardResultData | null>(null);
  const listQ = useQuery({
    queryKey: ["my-cards", q.trim()],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("search_my_cards", { _q: q.trim() });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function stamp(c: { id: string; token: string; customer_name: string }) {
    setBusyId(c.id);
    const { data, error } = await supabase.rpc("add_stamp", { _token: c.token });
    setBusyId(null);
    if (error || !data?.[0]) { toast.error(error?.message ?? "Timbro non registrato"); return; }
    const r = data[0];
    setResult({ token: c.token, name: r.customer_name, stamps: r.stamps, required: r.stamps_required, full: r.stamps >= r.stamps_required, justStamped: true });
    qc.invalidateQueries({ queryKey: ["my-cards"] });
    qc.invalidateQueries({ queryKey: ["cards"] });
  }

  if (result) return <CardResult r={result} doneLabel="Torna ai clienti" onDone={() => { setResult(null); qc.invalidateQueries({ queryKey: ["my-cards"] }); qc.invalidateQueries({ queryKey: ["cards"] }); }} />;

  const rows = listQ.data ?? [];
  return (
    <div>
      <h2 className="text-2xl font-semibold">Clienti e timbri</h2>
      <p className="mt-1 text-sm text-muted-foreground">Cerca un cliente per aggiungere un timbro a mano.</p>
      <div className="relative mt-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Cerca per nome" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cerca cliente" />
      </div>
      <ul className="mt-3 divide-y rounded-2xl border bg-card">
        {listQ.isLoading && <li className="p-5 text-sm text-muted-foreground">Caricamento…</li>}
        {!listQ.isLoading && rows.length === 0 && <li className="p-5 text-sm text-muted-foreground">{q.trim() ? "Nessun cliente trovato." : "Ancora nessun cliente. Esponi il QR al bancone!"}</li>}
        {rows.map((c) => {
          const full = c.stamps >= c.stamps_required;
          return (
            <li key={c.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="truncate font-medium">{c.customer_name}</div>
                <div className="text-xs text-muted-foreground">{c.stamps}/{c.stamps_required} timbri · {c.rewards_count} premi</div>
              </div>
              {full ? (
                <Button size="sm" variant="accent" onClick={() => setResult({ token: c.token, name: c.customer_name, stamps: c.stamps, required: c.stamps_required, full: true, justStamped: false })}><Gift /> Premio</Button>
              ) : (
                <Button size="sm" variant="outline" disabled={busyId === c.id} onClick={() => stamp(c)} aria-label={`Aggiungi timbro a ${c.customer_name}`}><Plus /> Timbro</Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
