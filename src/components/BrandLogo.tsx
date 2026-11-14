import { Link } from "@tanstack/react-router";

type BrandLogoProps = { className?: string; compact?: boolean; linked?: boolean };

export function BrandLogo({ className = "", compact = false, linked = true }: BrandLogoProps) {
  const content = (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg aria-hidden="true" viewBox="0 0 48 48" className="size-10 shrink-0">
        <rect x="5" y="13" width="34" height="27" rx="5" fill="#fff8e9" stroke="#593521" strokeWidth="2.5" transform="rotate(-7 22 26)" />
        <path d="M13 23h6m-6 7h6m7-7h6m-6 7h6" stroke="#d99a32" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="34" cy="13" r="10" fill="#d99a32" stroke="#593521" strokeWidth="2" />
        <path d="m34 6 2 4 4 .6-3 3 .7 4.2-3.7-2-3.7 2 .7-4.2-3-3 4-.6z" fill="#fff8e9" />
      </svg>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-2xl font-bold tracking-tight text-current">Timbrino</span>
          <span className="mt-1 text-[10px] font-medium tracking-wide opacity-70">Fidelizzazione digitale</span>
        </span>
      )}
    </span>
  );
  return linked ? <Link to="/" aria-label="Timbrino — Home">{content}</Link> : content;
}
