# Bolt's Performance Journal

## 2026-07-03 - [WebGL Animation Loop on Scroll]
**Learning:** Heavy 3D rendering landing page components (such as Three.js/WebGL-based `ThreeHero`) continue to consume CPU and GPU resources at 60Hz/120Hz via `requestAnimationFrame` and high-frequency mousemove/scroll listeners, even when completely off-screen.
**Action:** Utilize `IntersectionObserver` to halt the `requestAnimationFrame` loop, disable rendering, and short-circuit scroll/mousemove event handlers when the component is not in the viewport.
