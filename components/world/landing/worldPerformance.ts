/**
 * Device capability and quality budget for the landing world.
 *
 * The point of this module is that the decision is made once, before the scene
 * is constructed, and every downstream choice (particle count, shadow maps,
 * pixel ratio, environment detail) reads the same object. Nothing is measured
 * mid-flight, because a quality level that changes while you scroll is more
 * distracting than a slightly lower one that never moves.
 */

export type WorldQuality = {
  mobile: boolean;
  pixelRatio: number;
  particleCount: number;
  shadows: boolean;
  shadowMapSize: number;
  environmentDetail: "reduced" | "full";
  /** Transmission glass is expensive on mobile GPUs; it is a desktop luxury. */
  allowTransmission: boolean;
};

const MOBILE_BREAKPOINT = 768;
/** Below this the particle ornament cannot pay for itself. */
const TINY_BREAKPOINT = 420;

export function getWorldQuality(): WorldQuality {
  if (typeof window === "undefined") {
    return {
      mobile: false,
      pixelRatio: 1,
      particleCount: 0,
      shadows: false,
      shadowMapSize: 512,
      environmentDetail: "reduced",
      allowTransmission: false
    };
  }

  const width = window.innerWidth;
  const mobile = width < MOBILE_BREAKPOINT;
  const tiny = width < TINY_BREAKPOINT;
  const dpr = window.devicePixelRatio || 1;

  return {
    mobile,
    pixelRatio: Math.min(dpr, mobile ? 1.2 : 1.6),
    particleCount: tiny ? 24 : mobile ? 36 : 96,
    shadows: !mobile,
    shadowMapSize: mobile ? 512 : 1024,
    environmentDetail: mobile ? "reduced" : "full",
    allowTransmission: !mobile
  };
}

/**
 * Cheap synchronous WebGL probe. Never throws, never leaves a context behind.
 */
export function supportsWebGL(): boolean {
  if (typeof window === "undefined") return false;

  try {
    const probe = document.createElement("canvas");
    const context =
      probe.getContext("webgl2") ??
      probe.getContext("webgl") ??
      probe.getContext("experimental-webgl");

    if (!context) return false;

    // Release the probe context immediately; browsers cap live contexts.
    const loseContext = (context as WebGLRenderingContext).getExtension("WEBGL_lose_context");
    loseContext?.loseContext();

    return true;
  } catch {
    return false;
  }
}

/** True when the visitor asked the operating system for less motion. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
