"use client";

type LogoProps = {
  size?: number;
  variant?: "icon" | "full" | "inline";
  className?: string;
};

/**
 * ScholarMind brand mark — a polished SVG logo that works as a standalone icon,
 * a full wordmark with icon, or an inline icon for buttons/headers.
 *
 * Colours are sourced from the app's CSS custom properties (globals.css):
 *   --accent-coral  → #ff8f6b
 *   --accent-gold   → #ffe083
 *   --accent-sky    → #6bddff
 *   --accent-mint   → #7cf0cf
 */
export function Logo({ size = 32, variant = "icon", className = "" }: LogoProps) {
  // Use the single source-of-truth brand SVG in `public/scholarmind-icon.svg`.
  // This keeps the asset consistent with the favicon and Next metadata.
  const src = "/scholarmind-icon.svg";

  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      width={size}
      height={size}
      className={className}
      alt="ScholarMind"
      style={{ display: "inline-block", verticalAlign: "middle" }}
    />
  );

  if (variant === "icon") return img;

  if (variant === "inline") {
    return <span className={`inline-flex items-center gap-2 ${className}`}>{img}</span>;
  }

  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      {img}
      <span className="flex flex-col">
        <span className="text-sm font-semibold leading-tight">ScholarMind</span>
        <span className="text-[10px] font-semibold uppercase leading-tight tracking-[0.2em]" style={{ color: "var(--accent-coral)" }}>
          by Mind
        </span>
      </span>
    </span>
  );
}
