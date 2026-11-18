"use client";

/**
 * The world without WebGL.
 *
 * Not an apology and not a spinner: a composed, static portrait of the same
 * island, built from CSS layers so it costs nothing and cannot fail. It is used
 * three ways —
 *
 *   1. as the placeholder while the scene chunk downloads,
 *   2. as the permanent world for a device with no WebGL,
 *   3. as the reduced-motion world, where a moving camera would be unwelcome.
 *
 * Everything it depicts exists in the real campus: the hub at the centre, the
 * library to the south-west, the observatory to the north-west, the practice
 * terraces to the east and the garden in front.
 */

type WorldPosterProps = {
  /** Dims the art so overlay copy stays readable. */
  dim?: boolean;
  className?: string;
};

const PLACES = [
  { label: "Library", left: "27%", top: "38%", tone: "var(--accent-gold)" },
  { label: "Observatory", left: "20%", top: "62%", tone: "var(--accent-sky)" },
  { label: "Practice", left: "74%", top: "47%", tone: "var(--accent-mint)" },
  { label: "Garden", left: "66%", top: "68%", tone: "var(--accent-mint)" },
  { label: "Hub", left: "49%", top: "57%", tone: "var(--accent-coral)" }
];

export function WorldPoster({ dim = false, className = "" }: WorldPosterProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      style={{
        background:
          "radial-gradient(46rem 26rem at 50% 62%, rgba(220,165,102,0.20), transparent 66%), radial-gradient(38rem 22rem at 22% 78%, rgba(136,183,206,0.14), transparent 68%), linear-gradient(180deg, #070c11 0%, #0a1219 52%, #05090d 100%)",
        opacity: dim ? 0.72 : 1
      }}
    >
      {/* The island: one elliptical plate, lit from the top. */}
      <div
        className="absolute left-1/2 top-1/2 h-[46%] w-[68%] -translate-x-1/2 -translate-y-1/2 rounded-[50%]"
        style={{
          background:
            "radial-gradient(ellipse at 46% 34%, #24333f 0%, #1a2631 46%, #121c25 72%, #0b131a 100%)",
          boxShadow:
            "inset 0 2px 0 rgba(233,206,154,0.18), inset 0 -22px 44px rgba(0,0,0,0.55), 0 40px 80px rgba(0,0,0,0.5)"
        }}
      />

      {/* Water ring under the plate. */}
      <div
        className="absolute left-1/2 top-[54%] h-[34%] w-[82%] -translate-x-1/2 rounded-[50%] opacity-60 blur-[2px]"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(136,183,206,0.16) 0%, rgba(136,183,206,0.05) 52%, transparent 74%)"
        }}
      />

      {/* Warm windows on the hub. */}
      <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-full">
        <div className="absolute inset-x-3 bottom-0 h-10 rounded-t-[40%] bg-[linear-gradient(180deg,rgba(233,206,154,0.5),rgba(220,165,102,0.12))] blur-[2px]" />
        <div className="absolute inset-x-6 bottom-0 h-14 rounded-t-[46%] bg-[linear-gradient(180deg,rgba(220,165,102,0.34),transparent)] blur-[6px]" />
        <div className="absolute left-1/2 top-0 h-6 w-6 -translate-x-1/2 rotate-45 rounded-sm bg-[rgba(233,206,154,0.24)]" />
      </div>

      {PLACES.map((place) => (
        <div
          key={place.label}
          className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5"
          style={{ left: place.left, top: place.top }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: place.tone, boxShadow: `0 0 10px ${place.tone}` }}
          />
          <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-2)]">
            {place.label}
          </span>
        </div>
      ))}

      {/* Atmospheric vignette so the edges never look cut. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 46%, transparent 40%, rgba(5,9,13,0.62) 100%)"
        }}
      />
    </div>
  );
}
