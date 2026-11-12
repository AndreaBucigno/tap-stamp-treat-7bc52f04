import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Informativa privacy (bozza) — Timbrino" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Torna al sito
        </Link>
        <article className="py-10">
          <p className="inline-flex rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold uppercase text-accent">
            Bozza da completare
          </p>
          <h1 className="mt-4 text-4xl font-bold">Informativa privacy</h1>
          <p className="mt-4 rounded-2xl border bg-secondary p-4 text-sm">
            Questa bozza non è pronta per la pubblicazione: completa i campi evidenziati e fai verificare il testo
            prima di usarlo come informativa ufficiale.
          </p>

          <div className="mt-8 space-y-8">
            <section>
              <h2 className="text-xl font-semibold">Titolare del trattamento</h2>
              <p className="mt-2 text-muted-foreground">
                <strong className="text-destructive">[DA COMPLETARE: nome o ragione sociale, sede e contatto privacy]</strong>
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold">Dati trattati</h2>
              <ul className="mt-2 list-disc space-y-2 pl-6 text-muted-foreground">
                <li>Dati dell’account del titolare e dei collaboratori, inclusi email e dati di accesso.</li>
                <li>Dati delle tessere: nome del cliente, codice QR, timbri, premi e relative date.</li>
                <li>
                  La richiesta di attivazione apre il programma email del visitatore con un messaggio precompilato:
                  il sito non invia il modulo a un proprio endpoint.
                </li>
                <li className="text-destructive">
                  [DA VERIFICARE: eventuali cookie, telemetria, log tecnici e altri strumenti di misurazione.]
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold">Finalità e base giuridica</h2>
              <p className="mt-2 text-destructive">
                [DA COMPLETARE: indicare finalità e base giuridica per ciascun trattamento.]
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold">Fornitori e trasferimenti</h2>
              <p className="mt-2 text-muted-foreground">
                L’app utilizza Supabase per autenticazione e dati e può usare Google per l’accesso OAuth.
                <span className="text-destructive"> [DA VERIFICARE: hosting, ruoli dei fornitori, localizzazione e trasferimenti dei dati.]</span>
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold">Conservazione, diritti e contatti</h2>
              <p className="mt-2 text-destructive">
                [DA COMPLETARE: tempi di conservazione, modalità per esercitare i diritti e informazioni sui reclami.]
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Contatto indicato per le richieste:{" "}
                <a className="underline" href="mailto:andrea.bucigno@stundenti.unipg.it">
                  andrea.bucigno@stundenti.unipg.it
                </a>
                . Verificare che sia il contatto appropriato per le richieste privacy.
              </p>
            </section>
          </div>
        </article>
      </div>
      <SiteFooter />
    </main>
  );
}
