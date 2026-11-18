import * as THREE from "three";
import { clamp01 } from "@/components/world/landing/worldMath";
import { SCHOLARMIND_PALETTE } from "@/components/world/landing/worldTypes";

/**
 * The world's material set.
 *
 * Every mesh in the landing campus draws from this one registry, so:
 *   - materials are shared (tens of draw calls, not hundreds)
 *   - the scroll timeline can retune the whole scene by touching ~6 objects
 *   - `dispose()` has an exhaustive list and cannot leak
 *
 * Architecture keeps a stable base colour on purpose. Only accents and glass
 * shift between stages — repainting stonework on every scroll is what makes
 * procedural scenes look like they are changing their mind.
 */

export type LearningWorldColors = {
  pastel: THREE.Color;
  light: THREE.Color;
  medium: THREE.Color;
  deep: THREE.Color;
  glass: THREE.Color;
};

/**
 * Five stage palettes, keyed to the six scroll stages (hero and hub share the
 * warm one). Interpolated continuously, never swapped.
 */
const STAGE_PALETTES = [
  { pastel: "#F3EDE1", light: "#E9CE9A", medium: "#DCA566", deep: "#7C5937", glass: "#88B7CE" },
  { pastel: "#FAF4E8", light: "#E9D4AF", medium: "#DCA566", deep: "#87633D", glass: "#B8D7DE" },
  { pastel: "#EDF6FA", light: "#A9C8D8", medium: "#88B7CE", deep: "#426B91", glass: "#D5F1FA" },
  { pastel: "#E9F0E9", light: "#B5D0BC", medium: "#8FC2AC", deep: "#3C5A4C", glass: "#C8E9D7" },
  { pastel: "#FAF8F3", light: "#E9E0D2", medium: "#DCA566", deep: "#8A6749", glass: "#DCE6E9" }
] as const;

/**
 * Continuous palette sample. `stage` is raw scroll progress (0–5); the result
 * blends the two palettes either side of it.
 */
export function getLearningWorldColors(stage: number): LearningWorldColors {
  const bounded = Math.max(0, Math.min(STAGE_PALETTES.length - 1, stage));
  const lowerIndex = Math.floor(bounded);
  const upperIndex = Math.min(STAGE_PALETTES.length - 1, lowerIndex + 1);
  const t = clamp01(bounded - lowerIndex);

  const lower = STAGE_PALETTES[lowerIndex];
  const upper = STAGE_PALETTES[upperIndex];

  const blend = (a: string, b: string) => new THREE.Color(a).lerp(new THREE.Color(b), t);

  return {
    pastel: blend(lower.pastel, upper.pastel),
    light: blend(lower.light, upper.light),
    medium: blend(lower.medium, upper.medium),
    deep: blend(lower.deep, upper.deep),
    glass: blend(lower.glass, upper.glass)
  };
}

/* -------------------------------------------------------------------------- */
/* Material keys                                                               */
/* -------------------------------------------------------------------------- */

export type WorldMaterialKey =
  | "stone"
  | "stoneLight"
  | "stoneDark"
  | "dome"
  | "ivory"
  | "plaster"
  | "soil"
  | "ground"
  | "groundHigh"
  | "foliage"
  | "foliageDeep"
  | "water"
  | "metal"
  | "brass"
  | "glassPanel"
  | "amberGlow"
  | "goldGlow"
  | "blueGlow"
  | "mintGlow"
  | "darkGlow"
  | "path";

/** Accent materials whose colour is retuned by the scroll palette. */
const TINTABLE: readonly WorldMaterialKey[] = [
  "amberGlow",
  "goldGlow",
  "blueGlow",
  "mintGlow",
  "glassPanel",
  "water"
];

export type WorldMaterials = {
  map: Record<WorldMaterialKey, THREE.MeshStandardMaterial>;
  /** Retune accent materials for a palette. Writes to ~6 materials per call. */
  applyPalette: (colors: LearningWorldColors, strength: number) => void;
  /** Set an emissive accent's intensity (per-stage building emphasis). */
  setGlow: (key: WorldMaterialKey, intensity: number) => void;
  dispose: () => void;
};

export function createWorldMaterials(options: { allowTransmission: boolean }): WorldMaterials {
  const owned: THREE.MeshStandardMaterial[] = [];

  function matte(color: string, roughness: number, metalness = 0.03) {
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness,
      metalness
    });
    owned.push(material);
    return material;
  }

  function glow(color: string, intensity: number) {
    const base = new THREE.Color(color);
    const material = new THREE.MeshStandardMaterial({
      color: base.clone(),
      emissive: base.clone(),
      emissiveIntensity: intensity,
      roughness: 0.44,
      metalness: 0
    });
    owned.push(material);
    return material;
  }

  const glassPanel = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(SCHOLARMIND_PALETTE.blue),
    roughness: 0.08,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    transmission: options.allowTransmission ? 0.82 : 0,
    ior: 1.48,
    thickness: 0.7,
    transparent: true,
    opacity: options.allowTransmission ? 0.62 : 0.9,
    emissive: new THREE.Color(SCHOLARMIND_PALETTE.blue),
    emissiveIntensity: 0.14
  });
  owned.push(glassPanel);

  const water = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#0f1c26"),
    roughness: 0.16,
    metalness: 0.62,
    transparent: true,
    opacity: 0.94
  });
  owned.push(water);

  const map: Record<WorldMaterialKey, THREE.MeshStandardMaterial> = {
    stone: matte(SCHOLARMIND_PALETTE.stone, 0.9),
    stoneLight: matte(SCHOLARMIND_PALETTE.stoneLight, 0.84),
    stoneDark: matte("#1e2932", 0.94),
    dome: matte("#54687a", 0.52, 0.18),
    ivory: matte(SCHOLARMIND_PALETTE.ivory, 0.74),
    plaster: matte("#cfc8b9", 0.8),
    soil: matte("#1a232c", 0.96),
    ground: matte("#101a22", 0.95),
    groundHigh: matte("#16212b", 0.93),
    foliage: matte(SCHOLARMIND_PALETTE.foliage, 0.92),
    foliageDeep: matte("#2b4438", 0.94),
    water,
    metal: matte("#4a5a66", 0.42, 0.7),
    brass: matte("#a6803f", 0.36, 0.82),
    glassPanel,
    amberGlow: glow(SCHOLARMIND_PALETTE.amber, 1.5),
    goldGlow: glow(SCHOLARMIND_PALETTE.amberLight, 1.2),
    blueGlow: glow(SCHOLARMIND_PALETTE.blue, 1.3),
    mintGlow: glow(SCHOLARMIND_PALETTE.mint, 1.15),
    darkGlow: glow("#6b563c", 0.5),
    path: matte("#2f3c47", 0.88)
  };

  // Remember each material's authored colour so tinting is reversible and never
  // accumulates drift across thousands of frames.
  const baseColors = new Map<WorldMaterialKey, THREE.Color>();
  (Object.keys(map) as WorldMaterialKey[]).forEach((key) => {
    baseColors.set(key, map[key].color.clone());
  });

  return {
    map,

    applyPalette(colors, strength) {
      const amount = clamp01(strength);

      TINTABLE.forEach((key) => {
        const material = map[key];
        const base = baseColors.get(key);
        if (!base) return;

        const target =
          key === "glassPanel" || key === "blueGlow"
            ? colors.glass
            : key === "amberGlow" || key === "goldGlow"
              ? colors.light
              : key === "mintGlow"
                ? colors.glass
                : colors.deep;

        material.color.lerpColors(base, target, amount);

        // Emissive tracks the body colour, so a "lit" material stays lit in
        // every palette rather than turning into flat paint.
        if (material.emissiveIntensity > 0) {
          material.emissive.lerpColors(base, target, amount);
        }
      });
    },

    setGlow(key, intensity) {
      map[key].emissiveIntensity = Math.max(0, intensity);
    },

    dispose() {
      owned.forEach((material) => material.dispose());
      owned.length = 0;
      baseColors.clear();
    }
  };
}

/* -------------------------------------------------------------------------- */
/* Placement, shared with the lighting rig                                     */
/* -------------------------------------------------------------------------- */

/** World-space origin of every building. One place to move a landmark. */
export const LANDMARK_ORIGIN = {
  hub: [0, 0, 0],
  library: [-5.4, 0, 4.4],
  observatory: [-6.4, 0, -3.2],
  practice: [6.0, 0, -2.8],
  garden: [4.8, 0, 4.9]
} as const satisfies Record<string, readonly [number, number, number]>;

/** Interior lamp position and colour per building. */
export const LANDMARK_LIGHT = {
  hub: { position: [0, 4.2, 0] as const, color: SCHOLARMIND_PALETTE.amber },
  library: { position: [-5.4, 4.6, 4.4] as const, color: SCHOLARMIND_PALETTE.amberLight },
  observatory: { position: [-6.4, 5.4, -3.2] as const, color: SCHOLARMIND_PALETTE.blue },
  practice: { position: [6.0, 2.6, -2.8] as const, color: SCHOLARMIND_PALETTE.mint },
  garden: { position: [4.8, 2.4, 4.9] as const, color: SCHOLARMIND_PALETTE.amberLight }
} as const;
