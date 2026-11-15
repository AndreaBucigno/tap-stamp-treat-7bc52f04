import { Link } from "@tanstack/react-router";
import logo from "@/assets/timbrino-logo.webp.asset.json";

type BrandLogoProps = { className?: string; compact?: boolean; linked?: boolean };

export function BrandLogo({ className = "", compact = false, linked = true }: BrandLogoProps) {
  const content = (
    <span className={`inline-flex shrink-0 items-center ${className}`}>
      <img src={logo.url} alt="Timbrino — Fidelizzazione digitale" width={428} height={398}
        className={compact ? "size-12 object-contain" : "h-auto w-24 object-contain sm:w-28"} />
    </span>
  );
  return linked ? <Link to="/" aria-label="Timbrino — Home">{content}</Link> : content;
}
