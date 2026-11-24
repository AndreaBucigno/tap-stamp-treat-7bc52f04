import { useRef, useState } from "react";
import { ImagePlus, Palette, RotateCcw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StampGrid } from "@/components/StampGrid";

type VenueAppearance = {
  id: string;
  name: string;
  stamps_required: number;
  card_primary_color: string;
  card_secondary_color: string;
  card_logo_url: string | null;
  card_tagline: string;
};

const palettes = [
  { name: "Bosco", primary: "#174F3C", secondary: "#F5EBD7" },
  { name: "Oceano", primary: "#173B63", secondary: "#E5F1F8" },
  { name: "Elegante", primary: "#252321", secondary: "#D9BD82" },
];

export function CardAppearanceEditor({ venue }: { venue: VenueAppearance }) {
  const [primary, setPrimary] = useState(venue.card_primary_color || palettes[0].primary);
  const [secondary, setSecondary] = useState(venue.card_secondary_color || palettes[0].secondary);
  const [logo, setLogo] = useState<string | null>(venue.card_logo_url);
  const [tagline, setTagline] = useState(venue.card_tagline || "Raccogli timbri e ricevi premi");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const changed = primary !== venue.card_primary_color || secondary !== venue.card_secondary_color || logo !== venue.card_logo_url || tagline !== venue.card_tagline;

  async function chooseLogo(file?: File) {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast.error("Carica un'immagine PNG, JPG o WebP.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Il logo deve pesare al massimo 2 MB.");
      return;
    }
    setBusy(true);
    try {
      const ext = file.type === "image/jpeg" ? "jpg" : file.type === "image/webp" ? "webp" : "png";
      const path = `${venue.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("venue-logos").upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("venue-logos").getPublicUrl(path);
      setLogo(data.publicUrl);
      toast.success("Logo caricato. Ricordati di salvare le modifiche.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Non è stato possibile caricare il logo.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function save() {
    setBusy(true);
    try {
      const { error } = await supabase.from("venues").update({
        card_primary_color: primary,
        card_secondary_color: secondary,
        card_logo_url: logo,
        card_tagline: tagline.trim(),
      }).eq("id", venue.id);
      if (error) throw error;
      toast.success("Aspetto della carta salvato!");
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Salvataggio non riuscito.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setPrimary(palettes[0].primary);
    setSecondary(palettes[0].secondary);
    setLogo(null);
    setTagline("Raccogli timbri e ricevi premi");
  }

  return (
    <section className="rounded-3xl border bg-card p-6 shadow-soft">
      <div className="flex items-center gap-2">
        <Palette className="size-5 text-accent" />
        <h2 className="text-2xl font-semibold">Aspetto della carta</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Personalizza la carta che vedranno tutti i tuoi clienti.</p>

      <div className="mt-5 grid gap-6 md:grid-cols-[1fr_1fr]">
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-medium">Palette</p>
            <div className="grid grid-cols-3 gap-2">
              {palettes.map((p) => (
                <button key={p.name} type="button" onClick={() => { setPrimary(p.primary); setSecondary(p.secondary); }}
                  className="rounded-xl border p-2 text-left transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <span className="mb-2 flex h-7 overflow-hidden rounded-md">
                    <span className="flex-1" style={{ backgroundColor: p.primary }} />
                    <span className="flex-1" style={{ backgroundColor: p.secondary }} />
                  </span>
                  <span className="text-xs font-medium">{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-medium">Colore principale
              <Input aria-label="Colore principale" type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} className="mt-2 h-11 cursor-pointer p-1" />
            </label>
            <label className="text-sm font-medium">Colore secondario
              <Input aria-label="Colore secondario" type="color" value={secondary} onChange={(e) => setSecondary(e.target.value)} className="mt-2 h-11 cursor-pointer p-1" />
            </label>
          </div>

          <label className="block text-sm font-medium">Frase sulla carta
            <Input className="mt-2" maxLength={90} value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Raccogli timbri e ricevi premi" />
          </label>

          <div>
            <p className="mb-2 text-sm font-medium">Logo del locale</p>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => void chooseLogo(e.target.files?.[0])} />
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
                <ImagePlus className="mr-2 size-4" /> Carica logo
              </Button>
              {logo && <Button type="button" variant="ghost" onClick={() => setLogo(null)} disabled={busy}><Trash2 className="mr-2 size-4" /> Rimuovi</Button>}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">PNG, JPG o WebP · massimo 2 MB.</p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">Anteprima in tempo reale</p>
          <div className="rounded-3xl p-5 shadow-soft" style={{ backgroundColor: primary, color: secondary }}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {logo ? <img src={logo} alt="Logo del locale" className="mb-3 size-12 rounded-xl bg-white/90 object-contain p-1" /> : <div className="mb-3 flex size-12 items-center justify-center rounded-xl border border-current/30 text-lg font-bold">{venue.name.slice(0,1).toUpperCase()}</div>}
                <p className="text-[10px] uppercase tracking-[0.18em] opacity-75">Carta fedeltà</p>
                <h3 className="mt-1 break-words text-xl font-bold">{venue.name}</h3>
              </div>
              <span className="shrink-0 text-2xl font-bold">3/{venue.stamps_required}</span>
            </div>
            <div className="mt-5"><StampGrid stamps={3} total={venue.stamps_required} light stampColor={secondary} /></div>
            <p className="mt-4 text-sm opacity-85">{tagline || "Raccogli timbri e ricevi premi"}</p>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">La grafica viene applicata anche alle carte già distribuite.</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" onClick={reset} disabled={busy}><RotateCcw className="mr-2 size-4" /> Ripristina</Button>
        <Button type="button" variant="accent" onClick={() => void save()} disabled={busy || !changed}><Save className="mr-2 size-4" /> Salva aspetto</Button>
      </div>
    </section>
  );
}
