import type * as THREE from "three";
import { clamp01, lerp, smoothstep } from "@/components/world/landing/worldMath";

/* -------------------------------------------------------------------------- */
/* Timeline                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Six stages, one per full-screen section of the landing page.
 *
 * The number is progress expressed in sections: 0 is the hero, 1 is the
 * library, and every value in between is a camera position somewhere on the
 * path between two of them. There is exactly one continuous timeline for the
 * whole page — the scene is never rebuilt between sections.
 */
export const WORLD_TIMELINE = {
  hero: 0,
  library: 1,
  observatory: 2,
  practice: 3,
  constellation: 4,
  hub: 5
} as const;

export type WorldStageId = keyof typeof WORLD_TIMELINE;

/** Highest progress value the scene accepts (one per transition). */
export const MAX_WORLD_PROGRESS = WORLD_TIMELINE.hub;

/* -------------------------------------------------------------------------- */
/* Brand palette                                                               */
/* -------------------------------------------------------------------------- */

/**
 * The single source of colour truth for the 3D world. Mirrors the CSS custom
 * properties in globals.css so the DOM overlay and the renderer cannot drift
 * apart.
 */
export const SCHOLARMIND_PALETTE = {
  ink: "#080D12",
  deep: "#101922",
  raised: "#17232D",

  ivory: "#F1EDE4",
  paper: "#FAF8F3",
  paperWhite: "#FFFFFF",

  amber: "#DCA566",
  amberLight: "#E9CE9A",

  blue: "#88B7CE",
  blueDeep: "#426B91",

  mint: "#8FC2AC",
  foliage: "#3C5A4C",

  stone: "#2B3843",
  stoneLight: "#3D4C58"
} as const;

/* -------------------------------------------------------------------------- */
/* Page backgrounds                                                            */
/* -------------------------------------------------------------------------- */

export type WorldBackground = {
  name: string;
  top: string;
  middle: string;
  bottom: string;
};

/**
 * Per-stage page background. The first four are the world at different times of
 * night; the last is the ivory editorial half of the brand, which is where the
 * page ends up deliberately rather than by accident.
 */
export const WORLD_BACKGROUNDS: readonly WorldBackground[] = [
  { name: "Midnight", top: "#080D12", middle: "#101922", bottom: "#05090D" },
  { name: "Library", top: "#101820", middle: "#1C2830", bottom: "#0A1118" },
  { name: "Observatory", top: "#081421", middle: "#112B3C", bottom: "#070D15" },
  { name: "Practice", top: "#101C1B", middle: "#20332F", bottom: "#080F10" },
  { name: "Ivory", top: "#FAF8F3", middle: "#F1EDE4", bottom: "#E6E1D7" }
] as const;

/**
 * Which background a raw progress value belongs to. Used by the DOM layer,
 * which wants a discrete answer; the renderer blends continuously instead.
 */
export function getBackgroundStage(progress: number): number {
  if (progress > 4.35) return 4;
  if (progress > 3.35) return 3;
  if (progress > 2.35) return 2;
  if (progress > 1.35) return 1;
  return 0;
}

/**
 * Continuous sample of the background scale, so the page background fades
 * between palettes exactly when the renderer does.
 */
export function sampleBackground(progress: number): {
  top: string;
  middle: string;
  bottom: string;
  toLight: number;
} {
  const clamped = Math.max(0, Math.min(WORLD_BACKGROUNDS.length - 1, progress));
  const lower = Math.floor(clamped);
  const upper = Math.min(WORLD_BACKGROUNDS.length - 1, lower + 1);
  const t = smoothstep(lower, upper, clamped);

  return {
    top: mixHex(WORLD_BACKGROUNDS[lower].top, WORLD_BACKGROUNDS[upper].top, t),
    middle: mixHex(WORLD_BACKGROUNDS[lower].middle, WORLD_BACKGROUNDS[upper].middle, t),
    bottom: mixHex(WORLD_BACKGROUNDS[lower].bottom, WORLD_BACKGROUNDS[upper].bottom, t),
    toLight: t
  };
}

/** Linear sRGB hex mix. Good enough for background gradients. */
export function mixHex(from: string, to: string, t: number): string {
  const amount = clamp01(t);
  const a = parseHex(from);
  const b = parseHex(to);
  const channel = (index: number) =>
    Math.round(lerp(a[index], b[index], amount))
      .toString(16)
      .padStart(2, "0");

  return `#${channel(0)}${channel(1)}${channel(2)}`;
}

function parseHex(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16)
  ];
}

/* -------------------------------------------------------------------------- */
/* Knowledge particles                                                         */
/* -------------------------------------------------------------------------- */

export const PARTICLE_CONFIG = {
  desktopCount: 96,
  mobileCount: 36,

  geometrySegments: 16,

  minimumRadius: 0.075,
  maximumRadius: 0.22,

  glassProbability: 0.22,

  gravity: 0,
  damping: 0.91,

  mouseRepelForce: 0.05,
  mouseRepelRadius: 4.4,

  centerAttractForce: 0.0035,
  bounciness: 0.02,

  collisionSubsteps: 2
} as const;

export type ParticleRole = "amber" | "blue" | "mint" | "glass";

/**
 * One knowledge particle: an idea, in flight.
 *
 * Every target vector is precomputed once at build time, so a frame only ever
 * blends between existing positions — it never allocates a formation.
 */
export type KnowledgeParticle = {
  id: number;
  radius: number;
  mass: number;

  position: THREE.Vector3;
  velocity: THREE.Vector3;

  /**
   * Particles are drawn as instances grouped by role, so there is no per-particle
   * mesh — which also keeps the whole system at four draw calls.
   */
  role: ParticleRole;

  /** Wide orbit around the campus — the default state. */
  orbitTarget: THREE.Vector3;
  /** A path drawn towards the library entrance. */
  libraryTarget: THREE.Vector3;
  /** A node on the observatory's knowledge network. */
  networkTarget: THREE.Vector3;
  /** A ring around the practice grounds. */
  practiceTarget: THREE.Vector3;
  /** The ScholarMind starburst at the hub. */
  hubTarget: THREE.Vector3;

  rotationSpeed: number;
  phase: number;
};

/* -------------------------------------------------------------------------- */
/* Pointer                                                                     */
/* -------------------------------------------------------------------------- */

export type WorldPointerState = {
  /** Normalised device space: -1 left, +1 right. */
  x: number;
  y: number;
  isDown: boolean;
  active: boolean;
  /** Smoothed pointer velocity in normalised units per second. */
  speed: number;
};

/**
 * A single shared pointer record.
 *
 * Deliberately module-scoped: every layer of the scene reads the same object, so
 * there is exactly one set of listeners and no React state in the hot path.
 */
export const worldPointer: WorldPointerState = {
  x: 99,
  y: 99,
  isDown: false,
  active: false,
  speed: 0
};

/* -------------------------------------------------------------------------- */
/* Landmarks                                                                   */
/* -------------------------------------------------------------------------- */

export type WorldLandmarkId = "hub" | "library" | "observatory" | "practice" | "garden";

export type WorldLandmark = {
  id: WorldLandmarkId;
  label: string;
  /** One short line, shown under the label. */
  tagline: string;
  detail: string;
  href: string;
  destination: string;
  requiresAuth: boolean;
  /** Model-space anchor the label pins to. */
  anchor: [number, number, number];
  accent: "amber" | "blue" | "mint" | "gold";
  /** Progress value where this landmark's label is fully visible. */
  revealAt: number;
};
