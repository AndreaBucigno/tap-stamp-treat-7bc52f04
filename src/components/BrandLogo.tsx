import { Link } from "@tanstack/react-router";
import mark from "@/assets/timbrino-mark.png.asset.json";

type BrandLogoProps = { className?: string; compact?: boolean; linked?: boolean };

export function BrandLogo({ className = "", compact = false, linked = true }: BrandLogoProps) {
  const content = (
    <span className={`inline-flex shrink-0 items-center gap-2 ${className}`}>
      <img src={mark.url} alt="" aria-hidden="true" width={256} height={231}
        className={compact ? "h-10 w-auto" : "h-11 w-auto sm:h-12"} />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-2xl font-bold tracking-tight text-foreground">Timbrino</span>
          <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Fidelizzazione digitale</span>
        </span>
      )}
      {compact && <span className="sr-only">Timbrino</span>}
    </span>
  );
  return linked ? <Link to="/" aria-label="Timbrino — Home">{content}</Link> : content;
}
