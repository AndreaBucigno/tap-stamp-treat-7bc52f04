import { Link } from "@tanstack/react-router";

const contactEmail = "andrea.bucigno@stundenti.unipg.it";

export function SiteFooter() {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-display text-2xl font-bold">Timbrino</p>
          <p className="text-sm opacity-75">Fidelizzazione digitale</p>
        </div>
        <nav aria-label="Informazioni" className="flex flex-wrap gap-x-5 gap-y-3 text-sm">
          <Link to="/privacy" className="underline underline-offset-4">Privacy (bozza)</Link>
          <Link to="/terms" className="underline underline-offset-4">Termini (bozza)</Link>
          <a href={`mailto:${contactEmail}`} className="underline underline-offset-4">Contatti</a>
        </nav>
        <p className="text-sm opacity-75">© {new Date().getFullYear()} Timbrino</p>
      </div>
    </footer>
  );
}
