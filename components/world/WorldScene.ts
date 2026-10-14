import * as THREE from "three";
import { buildCampus, type Campus } from "@/components/world/buildCampus";
import { WORLD_SPACES, type WorldSpaceId } from "@/components/world/worldSpaces";

/**
 * Owns the WebGL renderer, the camera and the input handling for the learning
 * world.
 *
 * Deliberately imperative rather than a React render loop: hotspot labels are
 * moved by writing `transform` straight onto their DOM nodes, so dragging the
 * world does not trigger a single React re-render.
 *
 * Robustness rules this class implements:
 *   - the animation loop stops when the tab is hidden or the canvas is offscreen
 *   - `webglcontextlost` is caught and reported, never thrown at the user
 *   - every geometry, material, listener and the renderer itself is released in
 *     `dispose()`
 */

export type WorldFocus = WorldSpaceId | null;

type SceneOptions = {
  /** Called once the first frame has been painted. */
  onReady?: () => void;
  /** Called if the GPU context is lost or WebGL is unavailable. */
  onFailure?: (reason: string) => void;
};

/** Camera framing for the overview. */
const OVERVIEW = {
  theta: Math.PI * 0.24,
  phi: Math.PI * 0.34,
  radius: 15.6,
  target: new THREE.Vector3(0, 1.05, 0)
};

const MIN_RADIUS = 7.5;
const MAX_RADIUS = 24;
const MIN_PHI = 0.22;
const MAX_PHI = Math.PI * 0.46;

/** Seconds of no interaction before the world drifts on its own. */
const IDLE_DELAY = 7;
const IDLE_DRIFT = 0.032;

export class WorldScene {
  private readonly canvas: HTMLCanvasElement;
  private readonly options: SceneOptions;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly campus: Campus;

  private readonly hotspots = new Map<string, HTMLElement>();
  private readonly clock = new THREE.Clock();

  // Spherical orbit state.
  private theta = OVERVIEW.theta;
  private phi = OVERVIEW.phi;
  private radius = OVERVIEW.radius;

  // Animated camera state, eased toward the values above each frame.
  private currentTarget = OVERVIEW.target.clone();
  private currentRadius = OVERVIEW.radius;
  private currentTheta = OVERVIEW.theta;
  private currentPhi = OVERVIEW.phi;

  private running = false;
  private frame = 0;
  private ready = false;
  private disposed = false;
  private visible = true;
  private idleSeconds = 0;
  private reducedMotion = false;

  private pointerId: number | null = null;
  private lastPointer = { x: 0, y: 0 };
  private pinchDistance = 0;
  private readonly activePointers = new Map<number, { x: number; y: number }>();

  private contextLost = false;
  private observer: IntersectionObserver | null = null;

  constructor(canvas: HTMLCanvasElement, options: SceneOptions = {}) {
    this.canvas = canvas;
    this.options = options;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
        failIfMajorPerformanceCaveat: false
      });
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "WebGL is not available on this device."
      );
    }

    this.renderer = renderer;
    this.renderer.setClearAlpha(0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x080d12, 14, 34);

    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 120);

    this.campus = buildCampus();
    this.scene.add(this.campus.group);
    this.scene.add(this.campus.lights);

    this.bindEvents();
    this.resize();
  }

  /* ------------------------------------------------------------------ */
  /* Lifecycle                                                           */
  /* ------------------------------------------------------------------ */

  registerHotspot(id: string, element: HTMLElement | null) {
    if (element) this.hotspots.set(id, element);
    else this.hotspots.delete(id);
  }

  setReducedMotion(reduced: boolean) {
    this.reducedMotion = reduced;
    if (reduced) {
      // Jump straight to the settled camera instead of easing.
      this.currentTarget.copy(this.target());
      this.currentRadius = this.radius;
      this.currentTheta = this.theta;
      this.currentPhi = this.phi;
    }
  }

  start() {
    if (this.running || this.disposed) return;
    this.running = true;
    this.clock.getDelta();
    this.frame = requestAnimationFrame(this.tick);
  }

  stop() {
    this.running = false;
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  resize() {
    const width = this.canvas.clientWidth || 1;
    const height = this.canvas.clientHeight || 1;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.6);

    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.stop();
    this.unbindEvents();

    this.campus.dispose();
    this.scene.clear();

    this.renderer.dispose();
    this.renderer.forceContextLoss?.();
    this.hotspots.clear();
  }

  /* ------------------------------------------------------------------ */
  /* Camera                                                              */
  /* ------------------------------------------------------------------ */

  private target(): THREE.Vector3 {
    const t = OVERVIEW.target;
    return new THREE.Vector3(t.x, t.y, t.z);
  }

  /**
   * Move to a space, or back to the overview.
   *
   * Framing is chosen so the selected building sits slightly off-centre and the
   * rest of the campus stays visible behind it — the world should never feel
   * like it vanished.
   */
  focus(id: WorldFocus) {
    if (id === null) {
      this.theta = OVERVIEW.theta;
      this.phi = OVERVIEW.phi;
      this.radius = OVERVIEW.radius;
      return;
    }

    const space = WORLD_SPACES.find((item) => item.id === id);
    if (!space) return;

    const [x, y, z] = space.position;
    // Approach from outside the ring so the camera never travels through a building.
    const angle = Math.atan2(z, x) || 0.6;
    const distance = space.focusDistance;

    this.theta = angle + Math.PI * 0.5;
    this.phi = Math.PI * 0.36;
    this.radius = distance;
    this.focusTarget = new THREE.Vector3(x * 0.72, Math.max(0.9, y + 0.7), z * 0.72);
    this.focused = true;
  }

  private focusTarget: THREE.Vector3 | null = null;
  private focused = false;

  /** Where the camera is currently looking. Eased when a focus is active. */
  private desiredTarget(): THREE.Vector3 {
    if (this.focused && this.focusTarget) return this.focusTarget;
    return this.target();
  }

  /* ------------------------------------------------------------------ */
  /* Input                                                              */
  /* ------------------------------------------------------------------ */

  private onPointerDown = (event: PointerEvent) => {
    this.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (this.activePointers.size === 1) {
      this.pointerId = event.pointerId;
      this.lastPointer = { x: event.clientX, y: event.clientY };
      this.canvas.setPointerCapture?.(event.pointerId);
    } else if (this.activePointers.size === 2) {
      this.pinchDistance = this.currentPinchDistance();
      this.canvas.style.cursor = "grabbing";
    }

    this.idleSeconds = 0;
  };

  private onPointerMove = (event: PointerEvent) => {
    if (!this.activePointers.has(event.pointerId)) return;
    this.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    this.idleSeconds = 0;

    if (this.activePointers.size >= 2) {
      const distance = this.currentPinchDistance();
      if (this.pinchDistance > 0 && distance > 0) {
        const scale = this.pinchDistance / distance;
        this.radius = THREE.MathUtils.clamp(this.radius * scale, MIN_RADIUS, MAX_RADIUS);
      }
      this.pinchDistance = distance;
      return;
    }

    if (this.pointerId !== event.pointerId) return;

    // Dragging always leaves a focused view, otherwise the camera fights the user.
    if (this.focused) {
      this.focused = false;
      this.focusTarget = null;
    }

    const deltaX = event.clientX - this.lastPointer.x;
    const deltaY = event.clientY - this.lastPointer.y;
    this.lastPointer = { x: event.clientX, y: event.clientY };

    this.theta -= deltaX * 0.006;
    this.phi = THREE.MathUtils.clamp(this.phi - deltaY * 0.004, MIN_PHI, MAX_PHI);
  };

  private onPointerUp = (event: PointerEvent) => {
    this.activePointers.delete(event.pointerId);
    if (this.pointerId === event.pointerId) this.pointerId = null;
    if (this.activePointers.size < 2) this.pinchDistance = 0;
    if (this.activePointers.size === 0) this.canvas.style.cursor = "grab";
  };

  private currentPinchDistance(): number {
    const points = Array.from(this.activePointers.values());
    if (points.length < 2) return 0;
    return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
  }

  private onWheel = (event: WheelEvent) => {
    // Only take over the gesture once the world is the primary target.
    event.preventDefault();
    this.idleSeconds = 0;
    this.radius = THREE.MathUtils.clamp(this.radius + event.deltaY * 0.008, MIN_RADIUS, MAX_RADIUS);
  };

  private onKeyDown = (event: KeyboardEvent) => {
    const step = 0.09;
    if (event.key === "ArrowLeft") this.theta += step;
    else if (event.key === "ArrowRight") this.theta -= step;
    else if (event.key === "ArrowUp") this.phi = THREE.MathUtils.clamp(this.phi - step * 0.6, MIN_PHI, MAX_PHI);
    else if (event.key === "ArrowDown") this.phi = THREE.MathUtils.clamp(this.phi + step * 0.6, MIN_PHI, MAX_PHI);
    else return;

    event.preventDefault();
    this.idleSeconds = 0;
    if (this.focused) {
      this.focused = false;
      this.focusTarget = null;
    }
  };

  private onContextLost = (event: Event) => {
    event.preventDefault();
    this.contextLost = true;
    this.stop();
    this.options.onFailure?.("The graphics context was lost.");
  };

  private onVisibilityChange = () => {
    if (document.hidden) this.stop();
    else this.start();
  };

  private bindEvents() {
    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    this.canvas.addEventListener("pointermove", this.onPointerMove);
    this.canvas.addEventListener("pointerup", this.onPointerUp);
    this.canvas.addEventListener("pointercancel", this.onPointerUp);
    this.canvas.addEventListener("wheel", this.onWheel, { passive: false });
    this.canvas.addEventListener("keydown", this.onKeyDown);
    this.canvas.addEventListener("webglcontextlost", this.onContextLost);
    document.addEventListener("visibilitychange", this.onVisibilityChange);

    if (typeof IntersectionObserver !== "undefined") {
      this.observer = new IntersectionObserver(
        ([entry]) => {
          this.visible = entry.isIntersecting;
          if (this.visible && !document.hidden) this.start();
          else this.stop();
        },
        { threshold: 0.02 }
      );
      this.observer.observe(this.canvas);
    }
  }

  private unbindEvents() {
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointercancel", this.onPointerUp);
    this.canvas.removeEventListener("wheel", this.onWheel);
    this.canvas.removeEventListener("keydown", this.onKeyDown);
    this.canvas.removeEventListener("webglcontextlost", this.onContextLost);
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
    this.observer?.disconnect();
    this.observer = null;
  }

  /* ------------------------------------------------------------------ */
  /* Frame                                                              */
  /* ------------------------------------------------------------------ */

  private tick = () => {
    if (!this.running || this.disposed || this.contextLost) return;

    const delta = Math.min(this.clock.getDelta(), 0.05);

    // Idle drift keeps the world feeling alive without demanding attention.
    this.idleSeconds += delta;
    if (
      !this.reducedMotion &&
      this.idleSeconds > IDLE_DELAY &&
      this.pointerId === null &&
      this.activePointers.size === 0 &&
      !this.focused
    ) {
      this.theta += IDLE_DRIFT * delta;
    }

    // Ease the camera toward its target. Frame-rate independent.
    const ease = this.reducedMotion ? 1 : 1 - Math.pow(0.0016, delta);
    const desired = this.desiredTarget();
    this.currentTarget.lerp(desired, ease);
    this.currentRadius += (this.radius - this.currentRadius) * ease;
    this.currentTheta += (this.theta - this.currentTheta) * ease;
    this.currentPhi += (this.phi - this.currentPhi) * ease;

    const sinPhi = Math.sin(this.currentPhi);
    this.camera.position.set(
      this.currentTarget.x + this.currentRadius * sinPhi * Math.cos(this.currentTheta),
      this.currentTarget.y + this.currentRadius * Math.cos(this.currentPhi),
      this.currentTarget.z + this.currentRadius * sinPhi * Math.sin(this.currentTheta)
    );
    this.camera.lookAt(this.currentTarget);

    // Motes drift very slowly. One uniform-less translation, effectively free.
    const motes = this.campus.group.children.find(
      (child): child is THREE.Points => child instanceof THREE.Points
    );
    if (motes && !this.reducedMotion) {
      motes.rotation.y += delta * 0.035;
    }

    this.renderer.render(this.scene, this.camera);

    if (!this.ready) {
      this.ready = true;
      this.options.onReady?.();
    }

    this.updateHotspots();
    this.frame = requestAnimationFrame(this.tick);
  };

  /**
   * Project each anchor and move its label.
   *
   * Depth is expressed as opacity and a small scale change so labels far behind
   * a building recede instead of competing with the ones in front.
   */
  private updateHotspots() {
    if (this.hotspots.size === 0) return;

    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (!width || !height) return;

    const vector = new THREE.Vector3();

    this.hotspots.forEach((element, id) => {
      const anchor = this.campus.anchors[id];
      if (!anchor) {
        element.style.opacity = "0";
        return;
      }

      vector.copy(anchor).project(this.camera);

      const behind = vector.z > 1;
      const depth = THREE.MathUtils.clamp(1 - (vector.z + 1) / 2, 0, 1);
      const offsetX = (vector.x * 0.5 + 0.5) * width;
      const offsetY = (-vector.y * 0.5 + 0.5) * height;

      const hidden = behind || vector.x < -1.25 || vector.x > 1.25 || vector.y < -1.25 || vector.y > 1.25;

      element.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0)`;
      element.style.opacity = hidden ? "0" : String(0.55 + depth * 0.45);
      element.style.pointerEvents = hidden ? "none" : "auto";
      element.style.zIndex = String(10 + Math.round(depth * 10));
    });
  }
}
