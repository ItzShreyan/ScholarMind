import * as THREE from "three";
import { buildKnowledgeParticles, type KnowledgeParticleSystem } from "@/components/world/landing/buildKnowledgeParticles";
import { buildLandingCampus, type CampusBuild } from "@/components/world/landing/buildLandingCampus";
import { buildWorldEnvironment, type EnvironmentBuild } from "@/components/world/landing/buildWorldEnvironment";
import { buildWorldLighting, type WorldLighting } from "@/components/world/landing/buildWorldLighting";
import {
  createCameraSample,
  landmarkEmphasis,
  sampleCameraPath,
  type CameraSample
} from "@/components/world/landing/worldCameraPath";
import { disposeBuildContext, createBuildContext } from "@/components/world/landing/worldGeometry";
import { getLearningWorldColors, createWorldMaterials, type WorldMaterials } from "@/components/world/landing/worldMaterials";
import { getWorldQuality, prefersReducedMotion, type WorldQuality } from "@/components/world/landing/worldPerformance";
import { clamp, damp, easeOutCubic } from "@/components/world/landing/worldMath";
import {
  MAX_WORLD_PROGRESS,
  WORLD_BACKGROUNDS,
  mixHex,
  worldPointer,
  type WorldLandmarkId
} from "@/components/world/landing/worldTypes";

/**
 * The landing world.
 *
 * One class owns the renderer, the camera, every object and the single
 * requestAnimationFrame loop. Nothing here is a React concern: the React layer
 * hands over a progress number and receives label positions, both imperatively.
 *
 * Performance rules this class is built around:
 *   - it stops when the tab is hidden and while the canvas is scrolled away
 *   - it never allocates inside `tick`
 *   - the renderer pixel ratio is capped by the device profile
 *   - `dispose()` releases every geometry, material, texture, listener and the
 *     GL context itself
 */

type SceneOptions = {
  onReady?: () => void;
  onFailure?: (reason: string) => void;
};

const LANDMARK_IDS: readonly WorldLandmarkId[] = [
  "hub",
  "library",
  "observatory",
  "practice",
  "garden"
];

/** Where each landmark's label sits during its own stage. */
const LABEL_STAGE: Record<WorldLandmarkId, number> = {
  hub: 0.1,
  library: 1,
  observatory: 2,
  practice: 3,
  garden: 3.6
};

export class LearningWorldLandingScene {
  private readonly canvas: HTMLCanvasElement;
  private readonly container: HTMLElement;
  private readonly options: SceneOptions;
  private readonly quality: WorldQuality;

  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly clock = new THREE.Clock();

  private readonly materials: WorldMaterials;
  private readonly buildContext;
  private readonly environment: EnvironmentBuild;
  private readonly campus: CampusBuild;
  private readonly particles: KnowledgeParticleSystem;
  private readonly lighting: WorldLighting;

  private readonly cameraSample: CameraSample = createCameraSample();
  private readonly smoothedPosition = new THREE.Vector3();
  private readonly smoothedTarget = new THREE.Vector3();
  private readonly parallax = new THREE.Vector3();
  private readonly pointerSmoothed = { x: 0, y: 0 };
  private readonly labels = new Map<string, HTMLElement>();
  private readonly projected = new THREE.Vector3();

  private progress = 0;
  private smoothProgress = 0;
  private entrance = 0;
  private animationFrame = 0;
  private running = false;
  private ready = false;
  private disposed = false;
  private visible = true;
  private contextLost = false;
  private reducedMotion = false;
  private resizeObserver: ResizeObserver | null = null;
  private intersectionObserver: IntersectionObserver | null = null;

  /** Smoothed background colour, blended into the fog each frame. */
  private readonly fogColor = new THREE.Color(WORLD_BACKGROUNDS[0].middle);

  constructor(canvas: HTMLCanvasElement, container: HTMLElement, options: SceneOptions = {}) {
    this.canvas = canvas;
    this.container = container;
    this.options = options;
    this.quality = getWorldQuality();
    this.reducedMotion = prefersReducedMotion();

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
      failIfMajorPerformanceCaveat: false
    });

    this.renderer.setClearAlpha(0);
    this.renderer.setPixelRatio(this.quality.pixelRatio);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.shadowMap.enabled = this.quality.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(this.fogColor, 26, 78);

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 220);

    this.materials = createWorldMaterials({ allowTransmission: this.quality.allowTransmission });
    this.buildContext = createBuildContext(this.materials);

    this.environment = buildWorldEnvironment(this.buildContext, this.quality);
    this.campus = buildLandingCampus(this.buildContext);
    this.lighting = buildWorldLighting(this.quality);
    this.particles = buildKnowledgeParticles({
      count: this.quality.particleCount,
      allowTransmission: this.quality.allowTransmission,
      reducedMotion: this.reducedMotion
    });

    this.scene.add(this.environment.group);
    this.scene.add(this.campus.group);
    this.scene.add(this.particles.group);
    this.scene.add(this.lighting.group);

    this.bindEvents();
    this.resize();

    // Seed the camera so the first painted frame is already in position.
    sampleCameraPath(0, this.cameraSample);
    this.smoothedPosition.copy(this.cameraSample.position);
    this.smoothedTarget.copy(this.cameraSample.target);
    this.applyCamera(1);
  }

  /* ------------------------------------------------------------------ */
  /* Public API                                                          */
  /* ------------------------------------------------------------------ */

  registerLabel(id: string, element: HTMLElement | null) {
    if (element) this.labels.set(id, element);
    else this.labels.delete(id);
  }

  setProgress(progress: number) {
    this.progress = clamp(progress, 0, MAX_WORLD_PROGRESS);
  }

  setReducedMotion(reduced: boolean) {
    this.reducedMotion = reduced;
  }

  startEntrance() {
    this.particles.startEntrance();
  }

  start() {
    if (this.running || this.disposed) return;

    this.running = true;
    this.clock.getDelta();
    this.animationFrame = requestAnimationFrame(this.tick);
  }

  stop() {
    this.running = false;

    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    this.animationFrame = 0;
  }

  resize() {
    const width = this.container.clientWidth || this.canvas.clientWidth || 1;
    const height = this.container.clientHeight || this.canvas.clientHeight || 1;

    this.renderer.setPixelRatio(this.quality.pixelRatio);
    this.renderer.setSize(width, height, false);

    this.camera.aspect = width / height;

    // On a narrow viewport the campus has to fit in a taller, thinner frame; a
    // wider FOV keeps the island in shot without moving the camera path.
    const narrow = width < 720;
    this.camera.fov = this.cameraSample.fov + (narrow ? 8 : 0);
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    if (this.disposed) return;

    this.disposed = true;
    this.stop();
    this.unbindEvents();

    this.particles.dispose();
    this.campus.dispose();
    disposeBuildContext(this.buildContext);
    this.materials.dispose();
    this.lighting.dispose();

    this.scene.clear();
    this.labels.clear();

    this.renderer.dispose();

    // Deliberately NOT `forceContextLoss()`. The canvas element is owned by
    // React, and on any remount — including React's development double-mount —
    // React tears this scene down and immediately rebuilds it on the *same*
    // canvas. Forcing the context to be lost makes that second construction
    // fail permanently, so the page would silently fall back to the static
    // poster on every load. `dispose()` plus zeroing the drawing buffer already
    // releases the GPU resources; the context goes when the canvas does.
    this.renderer.domElement.width = 0;
    this.renderer.domElement.height = 0;
  }

  /* ------------------------------------------------------------------ */
  /* Frame                                                              */
  /* ------------------------------------------------------------------ */

  private tick = () => {
    if (!this.running || this.disposed || this.contextLost) return;

    this.animationFrame = requestAnimationFrame(this.tick);

    const delta = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.elapsedTime;

    // Progress is followed, not snapped to. This is the "weighty" part: fast
    // scrolling makes the camera trail, and it settles a beat after the scroll
    // stops, which is what the reference motion feels like.
    this.smoothProgress += (this.progress - this.smoothProgress) * damp(delta, this.reducedMotion ? 40 : 5.5);

    if (this.entrance < 1) {
      this.entrance = Math.min(1, this.entrance + delta / 2.2);
    }

    this.updateCamera(delta);
    this.updateWorld(delta, elapsed);
    this.render();

    this.updateLabels();

    if (!this.ready) {
      this.ready = true;
      this.options.onReady?.();
    }
  };

  private updateCamera(delta: number) {
    sampleCameraPath(this.smoothProgress, this.cameraSample);

    // Pointer parallax: a few centimetres of counter-motion, which reads as
    // looking around rather than as the camera being attached to the cursor.
    if (!this.reducedMotion && worldPointer.active) {
      this.pointerSmoothed.x += (worldPointer.x - this.pointerSmoothed.x) * damp(delta, 3);
      this.pointerSmoothed.y += (worldPointer.y - this.pointerSmoothed.y) * damp(delta, 3);
    } else {
      this.pointerSmoothed.x += (0 - this.pointerSmoothed.x) * damp(delta, 2);
      this.pointerSmoothed.y += (0 - this.pointerSmoothed.y) * damp(delta, 2);
    }

    const target = this.cameraSample.target;
    floatTarget.set(target.x, target.y, target.z);
    this.smoothedTarget.lerp(floatTarget, damp(delta, 7));

    const desired = this.cameraSample.position;
    floatPosition.set(desired.x, desired.y, desired.z);
    this.smoothedPosition.lerp(floatPosition, damp(delta, 7));

    // Idle drift: the world is never completely still, but it never wanders off
    // the composition either.
    const driftAmount = this.reducedMotion ? 0 : 1;
    const driftX = Math.sin(this.clock.elapsedTime * 0.19) * 0.22 * driftAmount;
    const driftY = Math.cos(this.clock.elapsedTime * 0.15) * 0.16 * driftAmount;

    this.parallax.set(
      this.pointerSmoothed.x * 1.05 + driftX,
      this.pointerSmoothed.y * 0.55 + driftY,
      0
    );

    // Entrance: the camera starts further out and eases in, which is the fly-in.
    const entranceEase = easeOutCubic(this.entrance);
    const pullBack = 1 + (1 - entranceEase) * 0.5;

    floatPosition.copy(this.smoothedPosition).sub(this.smoothedTarget);
    floatPosition.multiplyScalar(pullBack);
    floatPosition.add(this.smoothedTarget);
    floatPosition.add(this.parallax);

    this.applyCamera(1);
  }

  /** Writes the smoothed vectors onto the camera. Takes no allocation path. */
  private applyCamera(fovBlend: number) {
    this.camera.position.copy(floatPosition);
    this.camera.lookAt(this.smoothedTarget);

    const narrow = this.container.clientWidth < 720;
    const desiredFov = this.cameraSample.fov * fovBlend + (narrow ? 8 : 0);

    if (Math.abs(this.camera.fov - desiredFov) > 0.02) {
      this.camera.fov += (desiredFov - this.camera.fov) * 0.2;
      this.camera.updateProjectionMatrix();
    }
  }

  private updateWorld(delta: number, elapsed: number) {
    const stage = this.smoothProgress;

    // Colours: palette sampled continuously, fog matched to the page gradient.
    const colors = getLearningWorldColors(stage);
    this.materials.applyPalette(colors, 0.85);

    const backgroundIndex = Math.min(
      WORLD_BACKGROUNDS.length - 1,
      Math.max(0, Math.floor(clamp(stage, 0, 4.999)))
    );
    const nextIndex = Math.min(WORLD_BACKGROUNDS.length - 1, backgroundIndex + 1);
    const localT = clamp(stage - backgroundIndex, 0, 1);

    const blended = mixHex(
      WORLD_BACKGROUNDS[backgroundIndex].middle,
      WORLD_BACKGROUNDS[nextIndex].middle,
      localT
    );
    fogScratch.set(blended);
    (this.scene.fog as THREE.Fog).color.lerp(fogScratch, damp(delta, 4));

    this.lighting.apply(stage, colors);
    this.lighting.update(delta, elapsed);

    // Per-landmark emphasis: the building whose section is on screen lights up.
    LANDMARK_IDS.forEach((id) => {
      this.campus.setEmphasis(id, landmarkEmphasis(stage, LABEL_STAGE[id], 0.95));
    });

    this.environment.update(delta, elapsed);
    this.campus.update(delta, elapsed);
    this.particles.update(delta, elapsed, stage, this.camera);
  }

  private render() {
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Projects each landmark anchor into container space and moves its label.
   *
   * Labels are written directly to `style.transform` so scrolling the page never
   * triggers a React render.
   */
  private updateLabels() {
    if (this.labels.size === 0) return;

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (!width || !height) return;

    this.labels.forEach((element, id) => {
      const landmark = this.campus.landmarks[id as WorldLandmarkId];
      if (!landmark) {
        element.style.opacity = "0";
        element.style.pointerEvents = "none";
        return;
      }

      this.projected.copy(landmark.anchor).project(this.camera);

      const behind = this.projected.z > 1;
      const x = (this.projected.x * 0.5 + 0.5) * width;
      const y = (-this.projected.y * 0.5 + 0.5) * height;
      const depth = clamp(1 - (this.projected.z + 1) / 2, 0, 1);

      const offscreen =
        behind ||
        this.projected.x < -1.15 ||
        this.projected.x > 1.15 ||
        this.projected.y < -1.15 ||
        this.projected.y > 1.15 ||
        x < -160 ||
        x > width + 160 ||
        y < -80 ||
        y > height + 80;

      // Only the building the camera has actually arrived at keeps a label.
      // Without this every landmark projects at once, and on a short viewport
      // the far ones land on top of the copy column — text under a label is
      // unreadable, and the page is supposed to be legible first.
      const emphasis = landmarkEmphasis(
        this.smoothProgress,
        LABEL_STAGE[id as WorldLandmarkId],
        0.45
      );
      const visible = !offscreen && emphasis > 0.04;

      element.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -100%)`;
      element.style.opacity = visible ? String((0.35 + depth * 0.65) * emphasis) : "0";
      element.style.pointerEvents = visible ? "auto" : "none";
      element.style.zIndex = String(20 + Math.round(depth * 20));
    });
  }

  /* ------------------------------------------------------------------ */
  /* Events                                                             */
  /* ------------------------------------------------------------------ */

  private onVisibilityChange = () => {
    if (document.hidden) this.stop();
    else if (this.visible) this.start();
  };

  private onContextLost = (event: Event) => {
    event.preventDefault();
    this.contextLost = true;
    this.stop();
    this.options.onFailure?.("The graphics context was lost.");
  };

  private onContextRestored = () => {
    this.contextLost = false;
    this.start();
  };

  private bindEvents() {
    document.addEventListener("visibilitychange", this.onVisibilityChange);
    this.canvas.addEventListener("webglcontextlost", this.onContextLost);
    this.canvas.addEventListener("webglcontextrestored", this.onContextRestored);

    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(this.container);
    }

    // The canvas is a full-viewport background; when the page has scrolled past
    // it there is nothing to draw. The observer keeps the loop off at that point.
    if (typeof IntersectionObserver !== "undefined") {
      this.intersectionObserver = new IntersectionObserver(
        ([entry]) => {
          this.visible = entry.isIntersecting;
          if (this.visible && !document.hidden) this.start();
          else this.stop();
        },
        { threshold: 0.01 }
      );
      this.intersectionObserver.observe(this.canvas);
    }
  }

  private unbindEvents() {
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
    this.canvas.removeEventListener("webglcontextlost", this.onContextLost);
    this.canvas.removeEventListener("webglcontextrestored", this.onContextRestored);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.intersectionObserver?.disconnect();
    this.intersectionObserver = null;
  }
}

/* -------------------------------------------------------------------------- */
/* Module-scope scratch (never reallocated)                                    */
/* -------------------------------------------------------------------------- */

const floatPosition = new THREE.Vector3();
const floatTarget = new THREE.Vector3();
const fogScratch = new THREE.Color();
