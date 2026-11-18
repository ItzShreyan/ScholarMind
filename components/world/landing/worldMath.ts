/**
 * Numeric helpers shared by the landing scene.
 *
 * Pure functions only — no THREE import — so these are safe to use from React
 * components as well as from the render loop.
 */

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const clamp01 = (value: number) => clamp(value, 0, 1);

/** Hermite ease between `a` and `b`. Returns 0 below `a`, 1 above `b`. */
export const smoothstep = (a: number, b: number, value: number) => {
  if (a === b) return value < a ? 0 : 1;
  const t = clamp01((value - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Rising edge then falling edge: 0 → 1 → 0 across [a, d]. */
export const window4 = (
  riseStart: number,
  riseEnd: number,
  fallStart: number,
  fallEnd: number,
  value: number
) => smoothstep(riseStart, riseEnd, value) * (1 - smoothstep(fallStart, fallEnd, value));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);

export const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/**
 * Frame-rate independent approach factor.
 *
 * `1 - exp(-lambda * dt)` reaches the same fraction of the remaining distance
 * per unit of time regardless of frame rate, which is what keeps the camera
 * settle identical on a 60 Hz laptop and a 120 Hz monitor.
 */
export const damp = (delta: number, lambda: number) => 1 - Math.exp(-lambda * delta);

/** mulberry32 — tiny, fast, and deterministic across reloads. */
export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Inclusive-exclusive float in [min, max). */
export const randomBetween = (random: () => number, min: number, max: number) =>
  min + random() * (max - min);

/** Symmetric offset in [-amount, amount]. */
export const jitter = (random: () => number, amount: number) =>
  (random() - 0.5) * 2 * amount;
