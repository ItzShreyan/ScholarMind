import * as THREE from "three";
import { clamp, smoothstep } from "@/components/world/landing/worldMath";

/**
 * The camera's journey through the campus.
 *
 * One keyframe per scroll stage. Between two keyframes the camera eases with a
 * smoothstep, which has two properties this scene depends on:
 *
 *   1. It never overshoots. A Catmull-Rom spline will happily swing wide of a
 *      keyframe and take the camera through a wall; a per-segment ease cannot.
 *   2. It comes to rest at each keyframe. That is the "the world settles when
 *      you stop scrolling" feeling, and it means every section is framed
 *      exactly as designed rather than halfway between two designs.
 *
 * The cost is a slight deceleration approaching each stage, which reads as
 * deliberate cinematography rather than as a stutter.
 */

export type CameraKeyframe = {
  progress: number;
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
};

/**
 * Coordinates are tuned to the campus in `buildLandingCampus` — island radius
 * 12, library at (-5.4, 4.4), observatory at (-6.4, -3.2), practice at
 * (6.0, -2.8), hub 8 units tall at the origin.
 *
 * Each focus shot is placed by focal distance, not by eye. The vertical extent
 * a camera sees at distance `d` is `2·d·tan(fov/2)`, so framing a building of
 * height `h` at a readable ~45% of frame height needs `d ≈ 1.1 · h / tan(fov/2)`.
 * The buildings here are 4–8 units tall, which puts every close-up between 17
 * and 21 units out. Earlier revisions sat the camera ~10 units away and the
 * observatory became a featureless hemisphere filling the frame.
 *
 * The aim point is pulled ~20% toward the hub on purpose. That pushes the
 * subject off centre, away from the copy column — the library and practice
 * sections carry their text on the left, the observatory on the right.
 *
 * Every segment is also checked against the island: each straight leg between
 * two keyframes stays outside radius 12 in plan, or crosses above the hub's
 * 8-unit roofline (the observatory-to-practice leg passes at y = 11).
 */
export const CAMERA_KEYFRAMES: readonly CameraKeyframe[] = [
  {
    // 00 · Establish the whole world, three-quarter view, slightly high.
    progress: 0,
    position: [16.5, 13.5, 21.5],
    target: [0, 2.1, 0],
    fov: 38
  },
  {
    // 01 · Down the path to the library, from its front right. d ≈ 20.5.
    progress: 1,
    position: [8.0, 10.0, 18.0],
    target: [-4.2, 2.8, 3.4],
    fov: 34
  },
  {
    // 02 · Swing west, dome against the sky, off centre to the left. d ≈ 17.
    progress: 2,
    position: [-17.5, 11.0, 5.5],
    target: [-5.1, 2.9, -2.6],
    fov: 33
  },
  {
    // 03 · Cross to the east; the terraces read best from above. d ≈ 17.4.
    progress: 3,
    position: [18.0, 11.0, 4.5],
    target: [5.1, 1.6, -2.4],
    fov: 33
  },
  {
    // 04 · Pull back and up: the network needs the whole island in frame.
    progress: 4,
    position: [0.5, 17.5, 23],
    target: [0, 3.2, 0],
    fov: 40
  },
  {
    // 05 · Return to the hub, closer and warmer than the opening. d ≈ 19.8.
    progress: 5,
    position: [5.0, 10.0, 18.0],
    target: [0, 3.4, 0],
    fov: 35
  }
] as const;

export type CameraSample = {
  position: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
};

/** Allocates the three scratch vectors once; the render loop never allocates. */
export function createCameraSample(): CameraSample {
  return {
    position: new THREE.Vector3(),
    target: new THREE.Vector3(),
    fov: CAMERA_KEYFRAMES[0].fov
  };
}

/**
 * Writes the camera state for `progress` into `out`.
 *
 * Callers pass a sample object they own, so this is allocation-free in the hot
 * path. Progress outside [0, 5] clamps to the first/last keyframe.
 */
export function sampleCameraPath(progress: number, out: CameraSample): CameraSample {
  const bounded = clamp(progress, CAMERA_KEYFRAMES[0].progress, CAMERA_KEYFRAMES[CAMERA_KEYFRAMES.length - 1].progress);

  let index = 0;
  for (let i = 0; i < CAMERA_KEYFRAMES.length - 1; i += 1) {
    if (bounded >= CAMERA_KEYFRAMES[i].progress && bounded <= CAMERA_KEYFRAMES[i + 1].progress) {
      index = i;
      break;
    }
    if (bounded > CAMERA_KEYFRAMES[i + 1].progress) index = i + 1;
  }

  const from = CAMERA_KEYFRAMES[index];
  const to = CAMERA_KEYFRAMES[Math.min(CAMERA_KEYFRAMES.length - 1, index + 1)];
  const span = to.progress - from.progress;
  const t = span <= 0 ? 0 : smoothstep(from.progress, to.progress, bounded);

  out.position.set(
    from.position[0] + (to.position[0] - from.position[0]) * t,
    from.position[1] + (to.position[1] - from.position[1]) * t,
    from.position[2] + (to.position[2] - from.position[2]) * t
  );

  out.target.set(
    from.target[0] + (to.target[0] - from.target[0]) * t,
    from.target[1] + (to.target[1] - from.target[1]) * t,
    from.target[2] + (to.target[2] - from.target[2]) * t
  );

  out.fov = from.fov + (to.fov - from.fov) * t;

  return out;
}

/**
 * How strongly each building is "spotlit" right now, 0–1.
 *
 * Used by the lighting rig and by the DOM labels, so a building lights up at
 * exactly the moment its label becomes readable.
 */
export function landmarkEmphasis(progress: number, centre: number, spread = 0.85): number {
  return Math.max(0, 1 - Math.abs(progress - centre) / (spread * 2));
}
