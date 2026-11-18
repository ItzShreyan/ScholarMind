import * as THREE from "three";
import { LANDMARK_ORIGIN } from "@/components/world/landing/worldMaterials";
import type { WorldLandmarkId } from "@/components/world/landing/worldTypes";
import {
  addInstances,
  addMesh,
  FLAT_RING,
  shape,
  type BuildContext,
  type Placement
} from "@/components/world/landing/worldGeometry";

/**
 * The five buildings of the ScholarMind campus.
 *
 * Each is designed to be identifiable at a glance from the far end of the
 * camera path, because that is how the visitor navigates: the silhouette does
 * the work, not the detail. In order of recognisability:
 *
 *   Hub          hexagonal, tallest, a lit lantern at its apex
 *   Library      round, domed, pale stone with a lit cupola
 *   Observatory  drummed dome on a raised platform, with a tilted telescope
 *   Practice     stepped amphitheatre, open to the sky, mint-lit centre
 *   Garden       low terraces and trellises — deliberately the quietest shape
 *
 * Each building owns one accent material and one point light, so the scroll
 * timeline can spotlight a single landmark without touching the shared palette.
 */

export type LandmarkRig = {
  group: THREE.Group;
  light: THREE.PointLight;
  accent: THREE.MeshStandardMaterial;
  /** Vertical anchor for the DOM label. */
  anchor: THREE.Vector3;
};

export type CampusBuild = {
  group: THREE.Group;
  landmarks: Record<WorldLandmarkId, LandmarkRig>;
  /** 0–1 emphasis per landmark, applied from the frame loop. */
  setEmphasis: (id: WorldLandmarkId, value: number) => void;
  /** Slow ambient animation (telescope sway, lantern pulse). */
  update: (delta: number, elapsed: number) => void;
  dispose: () => void;
};

const PLATEAU_Y = 0;

/** Owner of the per-building accent materials, so they can all be released. */
type AccentRegistry = {
  create: (color: string, intensity: number) => THREE.MeshStandardMaterial;
  dispose: () => void;
};

function createAccentRegistry(): AccentRegistry {
  const owned: THREE.MeshStandardMaterial[] = [];

  return {
    create(color, intensity) {
      const base = new THREE.Color(color);
      const material = new THREE.MeshStandardMaterial({
        color: base.clone(),
        emissive: base.clone(),
        emissiveIntensity: intensity,
        roughness: 0.4,
        metalness: 0
      });
      owned.push(material);
      return material;
    },
    dispose() {
      owned.forEach((material) => material.dispose());
      owned.length = 0;
    }
  };
}

/**
 * A ring of columns, all sharing one geometry.
 *
 * Returned as an InstancedMesh, so the hub's eight, the library's twelve and
 * the practice hall's fourteen cost three draw calls in total.
 */
function addColonnade(
  context: BuildContext,
  parent: THREE.Object3D,
  options: {
    count: number;
    radius: number;
    height: number;
    thickness: number;
    baseY: number;
    materialKey: "ivory" | "stoneLight" | "stone";
    startAngle?: number;
    keyPrefix: string;
  }
) {
  const placements: Placement[] = [];
  const start = options.startAngle ?? 0;

  for (let index = 0; index < options.count; index += 1) {
    const angle = start + (index / options.count) * Math.PI * 2;
    placements.push({
      position: [
        Math.cos(angle) * options.radius,
        options.baseY + options.height / 2,
        Math.sin(angle) * options.radius
      ]
    });
  }

  return addInstances(
    context,
    parent,
    `${options.keyPrefix}-column`,
    shape.cylinder(options.thickness, options.thickness * 1.1, options.height, 8),
    options.materialKey,
    placements,
    { castShadow: true }
  );
}

/* -------------------------------------------------------------------------- */
/* 01 · The Learning Hub                                                      */
/* -------------------------------------------------------------------------- */

function buildLearningHub(context: BuildContext, accents: AccentRegistry): LandmarkRig {
  const group = new THREE.Group();
  group.position.set(LANDMARK_ORIGIN.hub[0], LANDMARK_ORIGIN.hub[1], LANDMARK_ORIGIN.hub[2]);
  group.name = "hub";

  const accent = accents.create("#E9CE9A", 1.4);

  // Three shallow hexagonal steps, each inset from the one below.
  addMesh(
    context,
    group,
    "hub-step-0",
    shape.cylinder(3.5, 3.7, 0.22, 6),
    "stone",
    { position: [0, PLATEAU_Y + 0.11, 0] },
    { receiveShadow: true }
  );
  addMesh(
    context,
    group,
    "hub-step-1",
    shape.cylinder(3.1, 3.25, 0.2, 6),
    "stoneLight",
    { position: [0, PLATEAU_Y + 0.32, 0] },
    { receiveShadow: true }
  );
  addMesh(
    context,
    group,
    "hub-step-2",
    shape.cylinder(2.72, 2.86, 0.18, 6),
    "stone",
    { position: [0, PLATEAU_Y + 0.51, 0] },
    { receiveShadow: true }
  );

  // The glass drum: the warm interior is visible through it from every side.
  addMesh(context, group, "hub-drum", shape.cylinder(2.1, 2.16, 2.5, 24), "glassPanel", {
    position: [0, PLATEAU_Y + 1.85, 0]
  });

  // The fire inside: a soft core, and a bright floor.
  addMesh(context, group, "hub-core", shape.cylinder(1.5, 1.6, 2.2, 20), "amberGlow", {
    position: [0, PLATEAU_Y + 1.72, 0]
  });
  addMesh(context, group, "hub-floor-light", shape.cylinder(2.0, 2.0, 0.05, 24), "goldGlow", {
    position: [0, PLATEAU_Y + 0.62, 0]
  });

  addColonnade(context, group, {
    count: 8,
    radius: 2.35,
    height: 2.5,
    thickness: 0.11,
    baseY: PLATEAU_Y + 0.6,
    materialKey: "ivory",
    keyPrefix: "hub"
  });

  // Cornice, banded so the roof has a lip to sit on.
  addMesh(context, group, "hub-cornice", shape.cylinder(2.62, 2.5, 0.16, 8), "stoneLight", {
    position: [0, PLATEAU_Y + 3.18, 0]
  });
  addMesh(context, group, "hub-cornice-light", shape.torus(2.36, 0.035, 8, 40), "amberGlow", {
    position: [0, PLATEAU_Y + 3.12, 0],
    rotation: FLAT_RING
  });

  // Roof: a hexagonal cone, then a lit lantern and spire.
  addMesh(context, group, "hub-roof", shape.cylinder(0.3, 2.66, 1.7, 6), "dome", {
    position: [0, PLATEAU_Y + 4.12, 0]
  });
  addMesh(context, group, "hub-roof-trim", shape.cylinder(0.46, 0.5, 0.5, 6), "stoneLight", {
    position: [0, PLATEAU_Y + 5.18, 0]
  });
  addMesh(context, group, "hub-lantern", shape.cylinder(0.3, 0.38, 0.62, 6), "amberGlow", {
    position: [0, PLATEAU_Y + 5.74, 0]
  });
  addMesh(context, group, "hub-spire", shape.cylinder(0.02, 0.045, 0.9, 6), "brass", {
    position: [0, PLATEAU_Y + 6.5, 0]
  });
  addMesh(context, group, "hub-finial", shape.sphere(0.1, 12, 10), "goldGlow", {
    position: [0, PLATEAU_Y + 7.0, 0]
  });

  // Entrance: a short flight of steps on the approach side.
  addMesh(context, group, "hub-entrance", shape.box(1.5, 0.1, 0.86), "stoneLight", {
    position: [0, PLATEAU_Y + 0.06, 3.42]
  });
  addMesh(context, group, "hub-entrance-trim", shape.box(1.5, 0.06, 0.14), "goldGlow", {
    position: [0, PLATEAU_Y + 0.06, 3.86]
  });

  const light = new THREE.PointLight(0xdca566, 14, 16, 1.6);
  light.position.set(0, PLATEAU_Y + 2.0, 0);
  group.add(light);

  return {
    group,
    light,
    accent,
    anchor: new THREE.Vector3(LANDMARK_ORIGIN.hub[0], 7.9, LANDMARK_ORIGIN.hub[2])
  };
}

/* -------------------------------------------------------------------------- */
/* 02 · The Library                                                           */
/* -------------------------------------------------------------------------- */

function buildLibrary(context: BuildContext, accents: AccentRegistry): LandmarkRig {
  const group = new THREE.Group();
  group.position.set(LANDMARK_ORIGIN.library[0], LANDMARK_ORIGIN.library[1], LANDMARK_ORIGIN.library[2]);
  group.name = "library";

  const accent = accents.create("#E9CE9A", 1.2);

  addMesh(
    context,
    group,
    "library-plinth",
    shape.cylinder(3.2, 3.4, 0.3, 32),
    "stoneLight",
    { position: [0, PLATEAU_Y + 0.15, 0] },
    { receiveShadow: true }
  );
  addMesh(
    context,
    group,
    "library-drum",
    shape.cylinder(2.6, 2.72, 2.6, 32),
    "ivory",
    { position: [0, PLATEAU_Y + 1.6, 0] },
    { castShadow: true, receiveShadow: true }
  );

  // Tall reading windows around the drum, alternating warm and cooler.
  const warmWindows: Placement[] = [];
  const coolWindows: Placement[] = [];

  for (let index = 0; index < 14; index += 1) {
    const angle = (index / 14) * Math.PI * 2 + 0.12;
    const placement: Placement = {
      position: [Math.cos(angle) * 2.62, PLATEAU_Y + 1.72, Math.sin(angle) * 2.62],
      rotation: [0, Math.PI / 2 - angle, 0]
    };

    if (index % 3 === 0) coolWindows.push(placement);
    else warmWindows.push(placement);
  }

  addInstances(context, group, "library-window-warm", shape.box(0.52, 1.5, 0.05), "amberGlow", warmWindows);
  addInstances(context, group, "library-window-cool", shape.box(0.52, 1.5, 0.05), "goldGlow", coolWindows);

  // A glass clerestory ring where the wall meets the dome.
  addMesh(context, group, "library-clerestory", shape.cylinder(2.42, 2.5, 0.55, 32), "glassPanel", {
    position: [0, PLATEAU_Y + 3.16, 0]
  });

  addMesh(context, group, "library-cornice", shape.cylinder(2.86, 2.7, 0.18, 32), "stone", {
    position: [0, PLATEAU_Y + 3.5, 0]
  });
  addMesh(
    context,
    group,
    "library-dome",
    shape.hemisphere(2.62, 32, 16),
    "dome",
    { position: [0, PLATEAU_Y + 3.58, 0] },
    { castShadow: true }
  );

  // Ribs across the dome. Cheap, and they stop it reading as a smooth blob at
  // the distance the camera actually views it from.
  const ribs: Placement[] = [];
  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2;
    ribs.push({
      position: [Math.cos(angle) * 1.95, PLATEAU_Y + 3.62, Math.sin(angle) * 1.95],
      rotation: [0, -angle, 0]
    });
  }
  addInstances(context, group, "library-rib", shape.box(0.09, 0.09, 1.75), "stoneLight", ribs);

  // The dome ring uses this building's own accent material, so the scroll
  // timeline can brighten it without repainting every lit surface on the island.
  const domeRing = addMesh(context, group, "library-dome-ring", shape.torus(2.6, 0.05, 8, 48), "stoneLight", {
    position: [0, PLATEAU_Y + 3.6, 0],
    rotation: FLAT_RING
  });
  domeRing.material = accent;

  // Cupola.
  addMesh(context, group, "library-cupola-base", shape.cylinder(0.44, 0.58, 0.42, 12), "stoneLight", {
    position: [0, PLATEAU_Y + 6.3, 0]
  });
  addMesh(context, group, "library-cupola-glass", shape.cylinder(0.4, 0.4, 0.32, 12), "goldGlow", {
    position: [0, PLATEAU_Y + 6.62, 0]
  });
  addMesh(context, group, "library-cupola-roof", shape.cone(0.55, 0.5, 12), "brass", {
    position: [0, PLATEAU_Y + 7.02, 0]
  });

  // Portico on the approach side, facing the hub.
  const porticoAngle = Math.atan2(-LANDMARK_ORIGIN.library[2], -LANDMARK_ORIGIN.library[0]);
  const portico = new THREE.Group();
  portico.rotation.y = Math.PI / 2 - porticoAngle;
  portico.position.set(
    Math.cos(porticoAngle) * 2.6,
    0,
    Math.sin(porticoAngle) * 2.6
  );

  addMesh(context, portico, "library-portico-lintel", shape.box(1.9, 0.16, 0.42), "stone", {
    position: [0, PLATEAU_Y + 1.28, 0]
  });
  addMesh(context, portico, "library-portico-door", shape.box(0.9, 1.18, 0.08), "amberGlow", {
    position: [0, PLATEAU_Y + 0.66, 0]
  });

  [-0.85, 0.85].forEach((offset) => {
    addMesh(context, portico, "library-portico-column", shape.cylinder(0.1, 0.11, 0.92, 8), "ivory", {
      position: [offset, PLATEAU_Y + 0.72, 0]
    });
  });
  group.add(portico);

  addMesh(context, group, "library-portico-step", shape.box(2.0, 0.12, 1.1), "stoneLight", {
    position: [
      Math.cos(porticoAngle) * 3.2,
      PLATEAU_Y + 0.06,
      Math.sin(porticoAngle) * 3.2
    ],
    rotation: [0, Math.PI / 2 - porticoAngle, 0]
  });

  const light = new THREE.PointLight(0xe9c58a, 11, 15, 1.7);
  light.position.set(0, PLATEAU_Y + 2.4, 0);
  group.add(light);

  return {
    group,
    light,
    accent,
    anchor: new THREE.Vector3(LANDMARK_ORIGIN.library[0], 8.6, LANDMARK_ORIGIN.library[2])
  };
}

/* -------------------------------------------------------------------------- */
/* 03 · The Observatory                                                       */
/* -------------------------------------------------------------------------- */

function buildObservatory(context: BuildContext, accents: AccentRegistry): LandmarkRig {
  const group = new THREE.Group();
  group.position.set(
    LANDMARK_ORIGIN.observatory[0],
    LANDMARK_ORIGIN.observatory[1],
    LANDMARK_ORIGIN.observatory[2]
  );
  group.name = "observatory";

  const accent = accents.create("#88B7CE", 1.3);

  // Raised platform: this building should sit above the tree line so its dome
  // is visible against the sky from the library.
  addMesh(
    context,
    group,
    "observatory-platform",
    shape.cylinder(3.0, 3.3, 0.9, 24),
    "stone",
    { position: [0, PLATEAU_Y + 0.45, 0] },
    { castShadow: true, receiveShadow: true }
  );
  addMesh(context, group, "observatory-platform-top", shape.cylinder(2.9, 2.9, 0.1, 24), "stoneLight", {
    position: [0, PLATEAU_Y + 0.92, 0]
  });

  // Stair flight down to the path, on the hub-facing side.
  for (let index = 0; index < 4; index += 1) {
    addMesh(context, group, "observatory-step", shape.box(1.5, 0.16, 0.42), "stoneLight", {
      position: [0.2 + index * 0.06, PLATEAU_Y + 0.72 - index * 0.2, 3.15 + index * 0.4]
    }, { receiveShadow: true });
  }

  // Drum and its glass band.
  addMesh(context, group, "observatory-drum", shape.cylinder(1.72, 1.84, 1.5, 24), "ivory", {
    position: [0, PLATEAU_Y + 1.72, 0]
  }, { castShadow: true, receiveShadow: true });
  addMesh(context, group, "observatory-glass", shape.cylinder(1.6, 1.66, 0.6, 24), "glassPanel", {
    position: [0, PLATEAU_Y + 2.55, 0]
  });

  // Dome, rotated so the slit faces the sky-ward side of the island.
  const dome = new THREE.Group();
  dome.position.set(0, PLATEAU_Y + 2.9, 0);
  dome.rotation.y = -0.7;

  addMesh(context, dome, "observatory-dome", shape.hemisphere(1.86, 28, 16), "dome", {}, { castShadow: true });
  addMesh(context, dome, "observatory-dome-band", shape.torus(1.84, 0.05, 8, 40), "stoneLight", {
    position: [0, 0.02, 0],
    rotation: FLAT_RING
  });

  // The slit: a bright gap cut through the dome. Two side panels frame it.
  addMesh(context, dome, "observatory-slit", shape.box(0.34, 1.5, 0.06), accent, {
    position: [0, 0.72, 0.62],
    rotation: [0.5, 0, 0]
  });
  [-0.26, 0.26].forEach((offset) => {
    addMesh(context, dome, "observatory-slit-edge", shape.box(0.06, 1.42, 0.1), "stoneLight", {
      position: [offset, 0.7, 0.66],
      rotation: [0.5, 0, 0]
    });
  });

  group.add(dome);

  // Telescope: a long tube on a fork mount, tilted up through the slit.
  const telescope = new THREE.Group();
  telescope.position.set(0, PLATEAU_Y + 3.0, 0);
  telescope.rotation.set(-0.62, 0.7, 0);

  addMesh(context, telescope, "observatory-mount", shape.cylinder(0.3, 0.38, 0.28, 10), "metal", {
    position: [0, -0.1, 0]
  });
  addMesh(context, telescope, "observatory-tube", shape.cylinder(0.16, 0.21, 2.0, 14), "brass", {
    position: [0, 0.9, 0]
  });
  addMesh(context, telescope, "observatory-tube-ring", shape.torus(0.2, 0.028, 8, 20), "metal", {
    position: [0, 1.5, 0],
    rotation: FLAT_RING
  });
  addMesh(context, telescope, "observatory-lens", shape.cylinder(0.17, 0.17, 0.06, 14), accent, {
    position: [0, 1.92, 0]
  });

  group.add(telescope);

  const light = new THREE.PointLight(0x88b7ce, 9, 15, 1.7);
  light.position.set(0, PLATEAU_Y + 2.4, 0);
  group.add(light);

  return {
    group,
    light,
    accent,
    anchor: new THREE.Vector3(
      LANDMARK_ORIGIN.observatory[0],
      5.6,
      LANDMARK_ORIGIN.observatory[2]
    )
  };
}

/* -------------------------------------------------------------------------- */
/* 04 · The Practice Grounds                                                  */
/* -------------------------------------------------------------------------- */

function buildPracticeGrounds(context: BuildContext, accents: AccentRegistry): LandmarkRig {
  const group = new THREE.Group();
  group.position.set(
    LANDMARK_ORIGIN.practice[0],
    LANDMARK_ORIGIN.practice[1],
    LANDMARK_ORIGIN.practice[2]
  );
  group.name = "practice";

  const accent = accents.create("#8FC2AC", 1.1);

  // Four descending terraces. Each is a ring, not a disc, so the amphitheatre
  // has a hollow centre you can see the mint floor through.
  const terraces = [
    { outer: 3.7, inner: 3.1, y: 0.18 },
    { outer: 3.1, inner: 2.5, y: 0.42 },
    { outer: 2.5, inner: 1.9, y: 0.66 },
    { outer: 1.9, inner: 1.3, y: 0.9 }
  ];

  terraces.forEach((terrace, index) => {
    addMesh(
      context,
      group,
      `practice-terrace-${index}`,
      shape.cylinder(terrace.outer, terrace.outer + 0.06, 0.24, 32),
      index % 2 === 0 ? "stone" : "stoneLight",
      { position: [0, PLATEAU_Y + terrace.y, 0] },
      { receiveShadow: true }
    );
  });

  // The mint floor at the centre.
  addMesh(context, group, "practice-floor", shape.cylinder(1.34, 1.4, 0.14, 32), "mintGlow", {
    position: [0, PLATEAU_Y + 0.98, 0]
  });
  addMesh(context, group, "practice-floor-ring", shape.torus(1.36, 0.04, 8, 48), accent, {
    position: [0, PLATEAU_Y + 1.03, 0],
    rotation: FLAT_RING
  });

  // Colonnade around the top terrace, open to the sky.
  addColonnade(context, group, {
    count: 14,
    radius: 3.42,
    height: 1.9,
    thickness: 0.075,
    baseY: PLATEAU_Y + 0.28,
    materialKey: "ivory",
    keyPrefix: "practice"
  });

  // A floating ring beam instead of a roof — the point is that it is open.
  addMesh(context, group, "practice-ring-beam", shape.torus(3.42, 0.075, 8, 56), "stone", {
    position: [0, PLATEAU_Y + 2.24, 0],
    rotation: FLAT_RING
  });
  addMesh(context, group, "practice-ring-light", shape.torus(3.42, 0.022, 6, 56), "mintGlow", {
    position: [0, PLATEAU_Y + 2.33, 0],
    rotation: FLAT_RING
  });

  // Four pylons marking the entrances, lit at the tip.
  [0, 1, 2, 3].forEach((index) => {
    const angle = (index / 4) * Math.PI * 2 + Math.PI / 4;
    const x = Math.cos(angle) * 3.86;
    const z = Math.sin(angle) * 3.86;

    addMesh(context, group, "practice-pylon", shape.box(0.22, 1.5, 0.22), "stoneDark", {
      position: [x, PLATEAU_Y + 0.75, z],
      rotation: [0, -angle, 0]
    });
    addMesh(context, group, "practice-pylon-light", shape.box(0.18, 0.16, 0.18), "mintGlow", {
      position: [x, PLATEAU_Y + 1.56, z],
      rotation: [0, -angle, 0]
    });
  });

  const light = new THREE.PointLight(0x8fc2ac, 8, 14, 1.8);
  light.position.set(0, PLATEAU_Y + 1.6, 0);
  group.add(light);

  return {
    group,
    light,
    accent,
    anchor: new THREE.Vector3(LANDMARK_ORIGIN.practice[0], 3.6, LANDMARK_ORIGIN.practice[2])
  };
}

/* -------------------------------------------------------------------------- */
/* 05 · The Revision Garden                                                   */
/* -------------------------------------------------------------------------- */

function buildRevisionGarden(context: BuildContext, accents: AccentRegistry): LandmarkRig {
  const group = new THREE.Group();
  group.position.set(LANDMARK_ORIGIN.garden[0], LANDMARK_ORIGIN.garden[1], LANDMARK_ORIGIN.garden[2]);
  group.name = "garden";

  const accent = accents.create("#E9CE9A", 0.9);

  // Three stepped planting terraces, each offset so they read as a slope.
  const beds: Array<readonly [number, number, number]> = [
    [-1.5, 0.16, -1.0],
    [0.0, 0.36, 0.0],
    [1.5, 0.56, 1.0]
  ];

  beds.forEach(([bx, by, bz], index) => {
    addMesh(context, group, `garden-bed-${index}`, shape.box(2.3, 0.22, 1.5), "stoneLight", {
      position: [bx, PLATEAU_Y + by - 0.11, bz]
    }, { receiveShadow: true });
    addMesh(context, group, `garden-soil-${index}`, shape.box(2.16, 0.1, 1.36), "foliageDeep", {
      position: [bx, PLATEAU_Y + by + 0.01, bz]
    });
  });

  // Low hedge rows on the beds.
  const hedges: Placement[] = [];
  beds.forEach(([bx, by, bz]) => {
    for (let index = 0; index < 4; index += 1) {
      hedges.push({
        position: [bx - 0.76 + index * 0.5, PLATEAU_Y + by + 0.13, bz],
        scale: [1, 1, 1]
      });
    }
  });
  addInstances(context, group, "garden-hedge", shape.sphere(0.16, 8, 6), "foliage", hedges);

  // Trellis arches over the middle terrace.
  for (let index = 0; index < 2; index += 1) {
    const archX = -0.85 + index * 1.7;
    [-0.55, 0.55].forEach((offset) => {
      addMesh(context, group, "garden-trellis-post", shape.box(0.06, 1.15, 0.06), "ivory", {
        position: [archX + offset, PLATEAU_Y + 1.14, 0.0]
      });
    });
    addMesh(context, group, "garden-trellis-top", shape.box(1.22, 0.06, 0.06), "ivory", {
      position: [archX, PLATEAU_Y + 1.72, 0.0]
    });
  }

  // The pavilion: four posts and a thin roof, deliberately small.
  const pavilion = new THREE.Group();
  pavilion.position.set(1.55, PLATEAU_Y, -1.15);
  addMesh(context, pavilion, "garden-pavilion-roof", shape.cylinder(0.92, 1.0, 0.1, 6), "stone", {
    position: [0, 1.72, 0]
  });
  addMesh(context, pavilion, "garden-pavilion-lamp", shape.sphere(0.13, 10, 8), "amberGlow", {
    position: [0, 1.52, 0]
  });
  [0, 1, 2, 3].forEach((index) => {
    const angle = (index / 4) * Math.PI * 2 + Math.PI / 4;
    addMesh(context, pavilion, "garden-pavilion-post", shape.cylinder(0.05, 0.06, 1.66, 6), "ivory", {
      position: [Math.cos(angle) * 0.72, 0.84, Math.sin(angle) * 0.72]
    });
  });
  group.add(pavilion);

  // A bench and a lantern at the edge, so the garden has a place to sit.
  addMesh(context, group, "garden-bench", shape.box(1.1, 0.07, 0.34), "stoneLight", {
    position: [-1.15, PLATEAU_Y + 0.52, 1.5]
  });
  addMesh(context, group, "garden-lantern", shape.sphere(0.1, 10, 8), accent, {
    position: [-1.15, PLATEAU_Y + 1.24, 1.5]
  });
  addMesh(context, group, "garden-lantern-post", shape.cylinder(0.03, 0.04, 0.7, 6), "metal", {
    position: [-1.15, PLATEAU_Y + 0.87, 1.5]
  });

  const light = new THREE.PointLight(0xe9ce9a, 6, 11, 1.9);
  light.position.set(0, PLATEAU_Y + 1.8, 0);
  group.add(light);

  return {
    group,
    light,
    accent,
    anchor: new THREE.Vector3(LANDMARK_ORIGIN.garden[0], 3.1, LANDMARK_ORIGIN.garden[2])
  };
}

/* -------------------------------------------------------------------------- */
/* Entry point                                                                */
/* -------------------------------------------------------------------------- */

export function buildLandingCampus(context: BuildContext): CampusBuild {
  const accents = createAccentRegistry();
  const group = new THREE.Group();
  group.name = "campus";

  const landmarks: Record<WorldLandmarkId, LandmarkRig> = {
    hub: buildLearningHub(context, accents),
    library: buildLibrary(context, accents),
    observatory: buildObservatory(context, accents),
    practice: buildPracticeGrounds(context, accents),
    garden: buildRevisionGarden(context, accents)
  };

  (Object.keys(landmarks) as WorldLandmarkId[]).forEach((id) => group.add(landmarks[id].group));

  // Base intensities, captured once so emphasis can be expressed as a multiple
  // of the designed value rather than an absolute.
  const baseIntensity: Record<WorldLandmarkId, number> = {
    hub: landmarks.hub.light.intensity,
    library: landmarks.library.light.intensity,
    observatory: landmarks.observatory.light.intensity,
    practice: landmarks.practice.light.intensity,
    garden: landmarks.garden.light.intensity
  };

  const baseAccent: Record<WorldLandmarkId, number> = {
    hub: landmarks.hub.accent.emissiveIntensity,
    library: landmarks.library.accent.emissiveIntensity,
    observatory: landmarks.observatory.accent.emissiveIntensity,
    practice: landmarks.practice.accent.emissiveIntensity,
    garden: landmarks.garden.accent.emissiveIntensity
  };

  return {
    group,
    landmarks,

    setEmphasis(id, value) {
      const rig = landmarks[id];
      if (!rig) return;

      const amount = Math.max(0, Math.min(1, value));
      rig.light.intensity = baseIntensity[id] * (0.55 + amount * 1.05);
      rig.accent.emissiveIntensity = baseAccent[id] * (0.8 + amount * 1.1);
    },

    update(delta, elapsed) {
      void delta;

      // The hub lantern breathes. It is the visual "heartbeat" of the campus,
      // and it is the only building that animates while idle.
      const pulse = 0.5 + Math.sin(elapsed * 0.9) * 0.5;
      landmarks.hub.accent.emissiveIntensity = baseAccent.hub * (0.85 + pulse * 0.35);

      // The telescope scans slowly, as though it is tracking something.
      landmarks.observatory.group.children.forEach((child) => {
        if (child instanceof THREE.Group && child.children.length > 2) {
          child.rotation.z = Math.sin(elapsed * 0.12) * 0.05;
        }
      });
    },

    dispose() {
      accents.dispose();
    }
  };
}
