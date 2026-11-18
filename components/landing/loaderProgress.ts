/**
 * Loader progress.
 *
 * Two speeds, one ceiling. While the scene is still building, progress creeps
 * toward 92% and stops there — enough to feel alive, never enough to claim the
 * world is ready. The moment the scene reports readiness the ceiling lifts and
 * the bar runs to 100 in a few frames.
 *
 * Nothing here waits for something that will not happen: the caller passes
 * `ready = true` for a WebGL failure too, because the fallback view is a valid
 * destination.
 */

const BUILD_CEILING = 92;
const READY_CEILING = 100;
const BUILD_SPEED = 1.7;
const READY_SPEED = 6;
/** Above this the bar snaps to 100 rather than asymptotically crawling. */
const SNAP_THRESHOLD = 99.4;
/** Frame delta is clamped so a background tab cannot jump the bar. */
export const MAX_FRAME_DELTA = 0.05;

export function updateLoaderProgress(value: number, ready: boolean, dt: number): number {
  const ceiling = ready ? READY_CEILING : BUILD_CEILING;
  const speed = ready ? READY_SPEED : BUILD_SPEED;
  const delta = Math.min(Math.max(dt, 0), MAX_FRAME_DELTA);

  let next = value + (ceiling - value) * speed * delta;

  if (ready && next >= SNAP_THRESHOLD) {
    next = READY_CEILING;
  }

  return Math.min(READY_CEILING, next);
}
