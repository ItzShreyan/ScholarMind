/**
 * Weighted smooth scrolling.
 *
 * A wheel event does not scroll the page directly; it moves a *target*, and a
 * requestAnimationFrame loop eases the real scroll position toward it. That is
 * what makes the world feel heavy rather than twitchy — the camera is reading
 * `window.scrollY`, so easing the scroll eases the camera for free.
 *
 * The accessibility contract is stricter than the effect, so:
 *   - touch scrolling is never intercepted (no touch listeners at all)
 *   - keyboard scrolling works because the browser still owns `scrollTo`
 *   - `prefers-reduced-motion` disables the whole thing
 *   - editable fields and `[data-native-scroll]` containers keep native wheel
 *   - ctrl/meta (browser zoom) is passed straight through
 *   - a native scroll the controller did not cause resyncs the target, so
 *     anchor jumps and back/forward restoration cannot fight the loop
 */

export type SmoothScrollController = {
  destroy: () => void;
  scrollTo: (position: number) => void;
};

const INTERPOLATION = 0.09;
const SETTLE_EPSILON = 0.5;

export function createSmoothScroll(options: { disabled?: boolean } = {}): SmoothScrollController {
  if (typeof window === "undefined") {
    return { destroy: () => {}, scrollTo: () => {} };
  }

  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

  let target = window.scrollY;
  let current = window.scrollY;
  let frame = 0;
  let disposed = false;
  /** Set while the loop itself is writing scrollTop, to ignore our own event. */
  let programmatic = false;

  const maxScroll = () =>
    Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

  const prefersReduced = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /** True when the event target belongs to something that must scroll natively. */
  const isNativeTarget = (eventTarget: EventTarget | null) => {
    if (!(eventTarget instanceof Element)) return false;
    if (eventTarget.closest("input, textarea, select, [contenteditable='true'], [data-native-scroll]")) {
      return true;
    }
    return false;
  };

  const animate = () => {
    if (disposed) return;

    current += (target - current) * INTERPOLATION;

    if (Math.abs(target - current) < SETTLE_EPSILON) {
      current = target;
      programmatic = true;
      window.scrollTo(0, current);
      programmatic = false;
      frame = 0;
      return;
    }

    programmatic = true;
    window.scrollTo(0, current);
    programmatic = false;

    frame = requestAnimationFrame(animate);
  };

  const onWheel = (event: WheelEvent) => {
    if (options.disabled || disposed) return;
    if (event.ctrlKey || event.metaKey) return;
    if (prefersReduced()) return;
    if (isNativeTarget(event.target)) return;

    event.preventDefault();

    target = clamp(target + event.deltaY, 0, maxScroll());

    if (!frame) frame = requestAnimationFrame(animate);
  };

  const onScroll = () => {
    if (programmatic) return;
    if (frame) return;
    // A scroll we did not drive (keyboard, anchor, restoration): adopt it.
    target = window.scrollY;
    current = window.scrollY;
  };

  const onResize = () => {
    target = clamp(target, 0, maxScroll());
  };

  window.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onResize, { passive: true });

  return {
    scrollTo(position: number) {
      if (disposed) return;

      target = clamp(position, 0, maxScroll());

      if (prefersReduced() || options.disabled) {
        current = target;
        window.scrollTo(0, current);
        return;
      }

      if (!frame) frame = requestAnimationFrame(animate);
    },

    destroy() {
      disposed = true;
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    }
  };
}
