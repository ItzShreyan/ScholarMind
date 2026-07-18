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
  const icon = (
    <svg
      viewBox="0 0 128 128"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="ScholarMind"
      style={{ filter: "drop-shadow(0 8px 28px rgba(57,208,255,0.2))" }}
    >
      <defs>
        {/* Base gradient — warm coral to cool sky like the existing BrandLink */}
        <radialGradient id="logoBg" cx="36%" cy="28%" r="74%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
          <stop offset="25%" stopColor="var(--accent-gold)" />
          <stop offset="55%" stopColor="var(--accent-sky)" />
          <stop offset="82%" stopColor="var(--accent-coral)" />
          <stop offset="100%" stopColor="var(--accent-ink)" />
        </radialGradient>
        {/* Glass highlight overlay */}
        <linearGradient id="logoGloss" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="rgba(255,255,255,0.35)" />
          <stop offset="0.5" stopColor="rgba(255,255,255,0.04)" />
          <stop offset="1" stopColor="rgba(255,255,255,0.12)" />
        </linearGradient>
        {/* Outer ring gradient */}
        <linearGradient id="logoRing" x1="14" x2="114" y1="96" y2="32">
          <stop offset="0" stopColor="var(--accent-gold)" />
          <stop offset="0.4" stopColor="var(--accent-sky)" />
          <stop offset="0.75" stopColor="var(--accent-mint)" />
          <stop offset="1" stopColor="var(--accent-coral)" />
        </linearGradient>
        {/* Glow filter */}
        <filter id="logoGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
        </filter>
      </defs>

      {/* Outer rounded-square shell — dark glass */}
      <rect width="128" height="128" rx="32" fill="var(--accent-ink)" opacity="0.92" />

      {/* Inner glow base */}
      <circle cx="64" cy="64" r="48" fill="url(#logoBg)" />

      {/* Centre brain/mind node — stylised open book / thought nebula */}
      <g transform="translate(64,64) scale(0.65) translate(-64,-64)">
        {/* Organic core shape */}
        <path
          d="M38 48C30 32 38 14 56 12c18-2 34 8 38 26 4-3 10 2 8 12"
          fill="none"
          stroke="rgba(15,23,42,0.7)"
          strokeWidth="4.5"
          strokeLinecap="round"
          opacity="0.5"
        />
        <path
          d="M32 56c-8 16-2 36 14 40 16 4 32-6 38-20 8 4 18-4 14-18"
          fill="none"
          stroke="rgba(15,23,42,0.7)"
          strokeWidth="4.5"
          strokeLinecap="round"
          opacity="0.5"
        />

        {/* Left hemisphere — coral */}
        <path
          d="M48 38c-10 10-10 28 0 38"
          fill="none"
          stroke="var(--accent-coral)"
          strokeWidth="5"
          strokeLinecap="round"
          opacity="0.85"
        />
        {/* Right hemisphere — sky */}
        <path
          d="M80 38c10 10 10 28 0 38"
          fill="none"
          stroke="var(--accent-sky)"
          strokeWidth="5"
          strokeLinecap="round"
          opacity="0.85"
        />
        {/* Centre connector — gold */}
        <path
          d="M58 46c2 6 2 14 0 20"
          fill="none"
          stroke="var(--accent-gold)"
          strokeWidth="4"
          strokeLinecap="round"
          opacity="0.7"
        />
        {/* Bottom arch — mint */}
        <path
          d="M40 78c8 8 18 8 24 0"
          fill="none"
          stroke="var(--accent-mint)"
          strokeWidth="3.5"
          strokeLinecap="round"
          opacity="0.75"
        />
      </g>

      {/* Glowing accent dots — knowledge nodes */}
      <circle cx="48" cy="52" r="3.5" fill="var(--accent-coral)" filter="url(#logoGlow)" opacity="0.9" />
      <circle cx="80" cy="52" r="3.5" fill="var(--accent-sky)" filter="url(#logoGlow)" opacity="0.9" />
      <circle cx="64" cy="44" r="2.5" fill="var(--accent-gold)" opacity="0.85" />

      {/* Outer ring — gradient arc (existing brand element) */}
      <path
        d="M18 84c18 24 50 30 74 8 16-14 22-36 14-52"
        fill="none"
        stroke="url(#logoRing)"
        strokeWidth="5.5"
        strokeLinecap="round"
        opacity="0.88"
      />

      {/* Glass highlight overlay */}
      <rect width="128" height="128" rx="32" fill="url(#logoGloss)" />
      {/* Border ring */}
      <rect width="124" height="124" x="2" y="2" rx="30" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
    </svg>
  );

  if (variant === "icon") {
    return icon;
  }

  if (variant === "inline") {
    return (
      <span className={`inline-flex items-center gap-2 ${className}`}>
        {icon}
      </span>
    );
  }

  // "full" variant — icon + wordmark
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      {icon}
      <span className="flex flex-col">
        <span className="text-sm font-semibold leading-tight">ScholarMind</span>
        <span
          className="text-[10px] font-semibold uppercase leading-tight tracking-[0.2em]"
          style={{ color: "var(--accent-coral)" }}
        >
          by Mind
        </span>
      </span>
    </span>
  );
}
