import { BrandLogo } from "@/components/BrandLogo";

const contactEmail = "andrea.bucigno@stundenti.unipg.it";

export function SiteFooter() {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 md:flex-row md:items-center md:justify-between">
        <BrandLogo linked={false} className="text-primary-foreground" />
        <nav aria-label="Informazioni" className="flex flex-wrap gap-x-5 gap-y-3 text-sm">
          <a href="/privacy.html" className="underline underline-offset-4">Privacy (bozza)</a>
          <a href="/terms.html" className="underline underline-offset-4">Termini (bozza)</a>
          <a href={`mailto:${contactEmail}`} className="underline underline-offset-4">Contatti</a>
        </nav>
        <p className="text-sm opacity-75">© {new Date().getFullYear()} Timbrino</p>
      </div>
    </footer>
  );
}
