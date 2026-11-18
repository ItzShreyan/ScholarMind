import * as THREE from "three";
import type { LearningWorldColors } from "@/components/world/landing/worldMaterials";
import type { WorldQuality } from "@/components/world/landing/worldPerformance";
import { clamp01 } from "@/components/world/landing/worldMath";

/**
 * The lighting rig.
 *
 * A warm key from the north-west, a cool rim from behind, a soft fill from the
 * front, and two bounces that carry the interior light of the hub and the
 * observatory out into the scene. Nothing here is dramatic on its own; the drama
 * comes from the contrast between the warm island and the cold sea.
 *
 * The rig is scroll-aware. As the visitor moves through the stages, the key
 * cools and the rim warms, which shifts the island from "a lamp in the dark" at
 * the hero to "a place in the evening blue" at the observatory.
 */

export type WorldLighting = {
  group: THREE.Group;
  /** Blend of the rig for the current stage and palette. */
  apply: (progress: number, colors: LearningWorldColors) => void;
  update: (delta: number, elapsed: number) => void;
  dispose: () => void;
};

export function buildWorldLighting(quality: WorldQuality): WorldLighting {
  const group = new THREE.Group();
  group.name = "lighting";

  const hemi = new THREE.HemisphereLight(0xe6f0ff, 0x18232c, 1.35);
  group.add(hemi);

  // Key. The only shadow-caster, and only on devices that can afford shadows.
  const key = new THREE.DirectionalLight(0xffdfbb, 2.1);
  key.position.set(-9, 15, 10);
  key.castShadow = quality.shadows;
  if (quality.shadows) {
    key.shadow.mapSize.set(quality.shadowMapSize, quality.shadowMapSize);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 46;
    key.shadow.camera.left = -16;
    key.shadow.camera.right = 16;
    key.shadow.camera.top = 16;
    key.shadow.camera.bottom = -16;
    key.shadow.bias = -0.0012;
    key.shadow.normalBias = 0.02;
  }
  group.add(key);

  // Cool rim from behind the campus, so buildings separate from the fog.
  const rim = new THREE.DirectionalLight(0x88b7ce, 1.45);
  rim.position.set(9, 10, -11);
  group.add(rim);

  // A gentle front fill so the camera-facing walls are never black.
  const fill = new THREE.DirectionalLight(0xffedda, 0.55);
  fill.position.set(0, 7, 15);
  group.add(fill);

  // Warm bounce from the hub's interior light.
  const warmBounce = new THREE.PointLight(0xdca566, 6, 22, 1.7);
  warmBounce.position.set(0, 4.5, 0);
  group.add(warmBounce);

  // Cool bounce from the water and the observatory side.
  const coolBounce = new THREE.PointLight(0x88b7ce, 3.5, 26, 1.7);
  coolBounce.position.set(-7, 4, -6);
  group.add(coolBounce);

  // Keep the authored colours so scroll blending is reversible per frame.
  const base = {
    hemiSky: hemi.color.clone(),
    hemiGround: hemi.groundColor.clone(),
    keyColor: key.color.clone(),
    rimColor: rim.color.clone(),
    fillColor: fill.color.clone(),
    warmColor: warmBounce.color.clone(),
    coolColor: coolBounce.color.clone()
  };

  const scratchColor = new THREE.Color();

  return {
    group,

    apply(progress, colors) {
      // Hero → library: warm and tightly lit. Observatory → practice: cooler,
      // wider. Constellation → hub: back toward warm but brighter.
      const coolness =
        clamp01((progress - 1.2) / 1.4) * (1 - clamp01((progress - 3.4) / 1.2));

      key.color.copy(base.keyColor).lerp(colors.pastel, 0.25 + coolness * 0.35);
      key.intensity = 2.1 - coolness * 0.55;

      rim.color.copy(base.rimColor).lerp(colors.glass, 0.15 + coolness * 0.5);
      rim.intensity = 1.45 + coolness * 0.7;

      fill.color.copy(base.fillColor);
      fill.intensity = 0.55 + clamp01(progress / 5) * 0.2;

      warmBounce.color.copy(base.warmColor).lerp(colors.light, 0.45);
      warmBounce.intensity = 6 + clamp01((progress - 4) / 1) * 3;

      coolBounce.color.copy(base.coolColor).lerp(colors.glass, 0.4);
      coolBounce.intensity = 3.5 + coolness * 2.6;

      // Hemisphere: sky picks up the palette's glass tone, and the ground stays
      // dark so nothing bounces light back onto the island from below.
      scratchColor.copy(base.hemiSky).lerp(colors.glass, 0.22 + coolness * 0.3);
      hemi.color.copy(scratchColor);
      hemi.groundColor.copy(base.hemiGround);
      hemi.intensity = 1.35 + clamp01(progress / 5) * 0.25;
    },

    update(delta, elapsed) {
      void delta;

      // A very slow breathing on the bounces. It is barely perceptible frame to
      // frame, but it stops a static scene from feeling frozen.
      const breath = Math.sin(elapsed * 0.34);
      warmBounce.intensity *= 1 + breath * 0.0015;
      coolBounce.intensity *= 1 - breath * 0.0015;
    },

    dispose() {
      key.dispose();
      rim.dispose();
      fill.dispose();
      warmBounce.dispose();
      coolBounce.dispose();
      hemi.dispose();
    }
  };
}
