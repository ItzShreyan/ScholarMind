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
/** Pixels per line, for the `deltaMode === 1` wheel events Firefox sends. */
const WHEEL_LINE_HEIGHT = 16;

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

  /**
   * Cached document height.
   *
   * `scrollHeight` forces a layout read, and a trackpad flick fires a wheel
   * event on every frame. Measuring once per scrolling burst instead of once
   * per event keeps the handler off the layout path; a resize, a programmatic
   * scroll and the end of a burst all refresh it.
   */
  let maxScrollValue = 0;

  const refreshMaxScroll = () => {
    maxScrollValue = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    return maxScrollValue;
  };

  const maxScroll = () => (maxScrollValue > 0 ? maxScrollValue : refreshMaxScroll());

  const prefersReduced = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /**
   * Wheel distance in pixels.
   *
   * Firefox reports wheel and trackpad deltas in *lines* (`deltaMode === 1`),
   * not pixels. Adding the raw number to a pixel target made one notch worth
   * about three pixels there — the page read as frozen. Chrome and Safari send
   * pixels and pass through untouched.
   */
  const wheelPixels = (event: WheelEvent) => {
    if (event.deltaMode === 1) return event.deltaY * WHEEL_LINE_HEIGHT;
    if (event.deltaMode === 2) return event.deltaY * window.innerHeight;
    return event.deltaY;
  };

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

    if (!frame) refreshMaxScroll();
    target = clamp(target + wheelPixels(event), 0, maxScroll());

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
    refreshMaxScroll();
    target = clamp(target, 0, maxScroll());
  };

  window.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onResize, { passive: true });

  return {
    scrollTo(position: number) {
      if (disposed) return;

      refreshMaxScroll();
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
