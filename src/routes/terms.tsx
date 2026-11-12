import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Termini del servizio (bozza) — Timbrino" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
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
          <h1 className="mt-4 text-4xl font-bold">Termini del servizio</h1>
          <p className="mt-4 rounded-2xl border bg-secondary p-4 text-sm">
            Questa bozza non stabilisce ancora condizioni contrattuali: completa i punti indicati e fai verificare
            il testo prima di pubblicarlo come versione definitiva.
          </p>

          <div className="mt-8 space-y-8">
            <section>
              <h2 className="text-xl font-semibold">Il servizio</h2>
              <p className="mt-2 text-muted-foreground">
                Timbrino permette alle attività aderenti di creare carte fedeltà digitali, registrare timbri tramite
                QR e definire premi per i clienti.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold">Attivazione e account</h2>
              <p className="mt-2 text-muted-foreground">
                L’accesso dei titolari avviene su invito. Le modalità di gestione degli account e dei collaboratori
                devono essere descritte in modo completo.
              </p>
              <p className="mt-2 text-destructive">
                [DA COMPLETARE: requisiti di accesso, responsabilità dell’account e procedura di chiusura.]
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold">Uso delle carte e dei premi</h2>
              <p className="mt-2 text-destructive">
                [DA COMPLETARE: regole per timbri, validità e riscatto dei premi, contestazioni e carte smarrite.]
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold">Condizioni economiche</h2>
              <p className="mt-2 text-destructive">
                [DA COMPLETARE con le condizioni che verranno definite per prezzi, pagamenti, rinnovi, disdetta e
                rimborsi. Non pubblicare finché non sono allineate alla configurazione effettiva del servizio.]
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold">Assistenza e condizioni finali</h2>
              <p className="mt-2 text-destructive">
                [DA COMPLETARE: contatto di assistenza, disponibilità del servizio, sospensione, responsabilità e
                legge applicabile.]
              </p>
            </section>
          </div>
        </article>
      </div>
      <SiteFooter />
    </main>
  );
}
