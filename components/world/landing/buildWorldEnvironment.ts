import * as THREE from "three";
import { LANDMARK_ORIGIN } from "@/components/world/landing/worldMaterials";
import { createSeededRandom, randomBetween } from "@/components/world/landing/worldMath";
import {
  addInstances,
  addMesh,
  FLAT_PLANE,
  FLAT_RING,
  shape,
  type BuildContext,
  type Placement
} from "@/components/world/landing/worldGeometry";

/**
 * The ground the campus stands on.
 *
 * Layers, bottom to top: open water, three terraced cliff bands, the plateau,
 * then paths, planters, lanterns and trees. Silhouette matters more than detail
 * here — the island is read from 20 units away in fog, so the cliff banding and
 * the tree line are what make it feel like a place rather than a disc.
 *
 * Everything is procedural, seeded and shares cached geometry.
 */

export type EnvironmentBuild = {
  group: THREE.Group;
  update: (delta: number, elapsed: number) => void;
};

export const ISLAND_RADIUS = 12;
const PLATEAU_Y = 0;

/** Seeded so the island is identical on every load. */
const RANDOM_SEED = 0x5eed1a7d;

export function buildWorldEnvironment(
  context: BuildContext,
  quality: { environmentDetail: "reduced" | "full" }
): EnvironmentBuild {
  const group = new THREE.Group();
  group.name = "environment";

  const random = createSeededRandom(RANDOM_SEED);
  const full = quality.environmentDetail === "full";

  /* ---- Open water ------------------------------------------------------ */
  addMesh(context, group, "sea", shape.circle(150, 64), "water", {
    position: [0, PLATEAU_Y - 2.3, 0],
    rotation: FLAT_PLANE
  });

  // Faint swell rings, animated below. Cheaper and more controllable than a
  // normal map, and it stops the sea being a dead flat plane.
  const swells: Array<{ mesh: THREE.Mesh; phase: number; speed: number }> = [];
  for (let index = 0; index < 2; index += 1) {
    const swell = addMesh(
      context,
      group,
      `swell-${index}`,
      shape.torus(ISLAND_RADIUS + 3.6 + index * 5.2, 0.05, 6, 96),
      "blueGlow",
      { position: [0, PLATEAU_Y - 2.18, 0], rotation: FLAT_RING }
    );
    swells.push({ mesh: swell, phase: index * Math.PI, speed: 0.24 + index * 0.09 });
  }

  /* ---- Cliff bands ----------------------------------------------------- */
  addMesh(context, group, "cliff-low", shape.cylinder(ISLAND_RADIUS - 0.4, ISLAND_RADIUS - 1.7, 1.6, 56), "soil", {
    position: [0, PLATEAU_Y - 1.5, 0]
  });
  addMesh(context, group, "cliff-mid", shape.cylinder(ISLAND_RADIUS - 0.1, ISLAND_RADIUS - 0.5, 0.95, 56), "stoneDark", {
    position: [0, PLATEAU_Y - 0.72, 0]
  });
  addMesh(
    context,
    group,
    "plateau",
    shape.cylinder(ISLAND_RADIUS, ISLAND_RADIUS - 0.1, 0.36, 56),
    "ground",
    { position: [0, PLATEAU_Y - 0.18, 0] },
    { receiveShadow: true }
  );

  // The lit clearing the buildings sit on — slightly lighter than the plateau,
  // so paths and architecture have something to separate from.
  addMesh(
    context,
    group,
    "clearing",
    shape.cylinder(8.4, 8.4, 0.06, 64),
    "groundHigh",
    { position: [0, PLATEAU_Y + 0.02, 0] },
    { receiveShadow: true }
  );

  // A worn stone apron directly under the hub.
  addMesh(
    context,
    group,
    "hub-apron",
    shape.cylinder(3.15, 3.3, 0.09, 6),
    "stoneLight",
    { position: [0, PLATEAU_Y + 0.05, 0] },
    { receiveShadow: true }
  );

  /* ---- Topography ------------------------------------------------------ */
  // Low mounds break the flat disc without disturbing the building pads.
  if (full) {
    const mounds: Placement[] = [];
    for (let index = 0; index < 10; index += 1) {
      const angle = randomBetween(random, 0, Math.PI * 2);
      const radius = randomBetween(random, 8.6, 11.4);
      mounds.push({
        position: [Math.cos(angle) * radius, PLATEAU_Y - 0.06, Math.sin(angle) * radius],
        rotation: [0, randomBetween(random, 0, Math.PI), 0],
        scale: [randomBetween(random, 0.9, 1.9), randomBetween(random, 0.16, 0.34), randomBetween(random, 0.8, 1.6)]
      });
    }
    addInstances(context, group, "mound", shape.sphere(1, 12, 8), "groundHigh", mounds, { receiveShadow: true });
  }

  /* ---- Paths ----------------------------------------------------------- */
  const routes = [
    { key: "path-library", to: LANDMARK_ORIGIN.library, bend: 1 },
    { key: "path-observatory", to: LANDMARK_ORIGIN.observatory, bend: -1 },
    { key: "path-practice", to: LANDMARK_ORIGIN.practice, bend: 1 },
    { key: "path-garden", to: LANDMARK_ORIGIN.garden, bend: -0.8 }
  ] as const;

  routes.forEach(({ key, to, bend }) => {
    const curve = buildPathCurve(to, bend);
    const ribbon = addMesh(
      context,
      group,
      key,
      () => new THREE.TubeGeometry(curve, 26, 0.44, 6, false),
      "path",
      { position: [0, PLATEAU_Y + 0.1, 0] },
      { receiveShadow: true }
    );
    // Flatten the tube into a ribbon that hugs the ground.
    ribbon.scale.y = 0.14;
  });

  // Stone edging: instanced blocks along both sides of every path.
  const edging: Placement[] = [];
  routes.forEach(({ to, bend }) => {
    const curve = buildPathCurve(to, bend);
    const samples = curve.getPoints(14);

    samples.forEach((point, index) => {
      if (index === 0 || index === samples.length - 1) return;

      const tangent = curve.getTangentAt(index / (samples.length - 1));
      const normalX = -tangent.z;
      const normalZ = tangent.x;
      const length = Math.hypot(normalX, normalZ) || 1;

      [-1, 1].forEach((side) => {
        edging.push({
          position: [
            point.x + (normalX / length) * 0.56 * side,
            PLATEAU_Y + 0.11,
            point.z + (normalZ / length) * 0.56 * side
          ],
          rotation: [0, Math.atan2(tangent.x, tangent.z), 0],
          scale: [0.9, 1, 1]
        });
      });
    });
  });
  addInstances(context, group, "edging", shape.box(0.16, 0.1, 0.44), "stoneLight", edging, { receiveShadow: true });

  /* ---- Bridge ---------------------------------------------------------- */
  buildBridge(context, group);

  /* ---- Lanterns -------------------------------------------------------- */
  const lanternPosts: Placement[] = [];
  const lanternGlobes: Placement[] = [];

  routes.forEach(({ to, bend }, routeIndex) => {
    const curve = buildPathCurve(to, bend);
    const samples = curve.getPoints(full ? 5 : 3);

    samples.forEach((point, index) => {
      if (index === 0 || index === samples.length - 1) return;

      const tangent = curve.getTangentAt(index / (samples.length - 1));
      const normalX = -tangent.z;
      const normalZ = tangent.x;
      const length = Math.hypot(normalX, normalZ) || 1;
      const side = routeIndex % 2 === 0 ? 1 : -1;
      const x = point.x + (normalX / length) * 1.0 * side;
      const z = point.z + (normalZ / length) * 1.0 * side;

      lanternPosts.push({ position: [x, PLATEAU_Y + 0.55, z] });
      lanternGlobes.push({ position: [x, PLATEAU_Y + 1.08, z] });
    });
  });

  addInstances(context, group, "lantern-post", shape.cylinder(0.028, 0.045, 1.12, 6), "metal", lanternPosts);
  addInstances(context, group, "lantern-globe", shape.sphere(0.11, 10, 8), "amberGlow", lanternGlobes);

  /* ---- Trees ----------------------------------------------------------- */
  const trunks: Placement[] = [];
  const crowns: Placement[] = [];

  const treeCount = full ? 46 : 22;
  for (let index = 0; index < treeCount; index += 1) {
    const angle = randomBetween(random, 0, Math.PI * 2);
    const radius = randomBetween(random, 8.8, 11.5);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const scale = randomBetween(random, 0.8, 1.5);

    trunks.push({ position: [x, PLATEAU_Y + 0.3 * scale, z], scale });
    crowns.push({
      position: [x, PLATEAU_Y + 0.95 * scale, z],
      rotation: [0, randomBetween(random, 0, Math.PI), 0],
      scale
    });
  }

  // Two small groves flanking the library approach.
  const groves: Array<readonly [number, number]> = [
    [-7.6, 7.4],
    [-3.0, 7.6]
  ];
  groves.forEach(([gx, gz]) => {
    for (let index = 0; index < (full ? 5 : 3); index += 1) {
      const x = gx + randomBetween(random, -1.1, 1.1);
      const z = gz + randomBetween(random, -1.1, 1.1);
      const scale = randomBetween(random, 0.7, 1.15);
      trunks.push({ position: [x, PLATEAU_Y + 0.3 * scale, z], scale });
      crowns.push({ position: [x, PLATEAU_Y + 0.95 * scale, z], scale });
    }
  });

  addInstances(context, group, "tree-trunk", shape.cylinder(0.05, 0.08, 0.64, 6), "stoneDark", trunks, {
    castShadow: full
  });
  addInstances(context, group, "tree-crown", shape.cone(0.42, 1.5, 7), "foliage", crowns, { castShadow: full });
  addInstances(
    context,
    group,
    "tree-crown-inner",
    shape.cone(0.3, 1.02, 7),
    "foliageDeep",
    crowns.map((crown) => {
      const [x, y, z] = crown.position ?? [0, 0, 0];
      return { position: [x, y + 0.36, z] as [number, number, number], scale: crown.scale };
    })
  );

  /* ---- Distant silhouettes -------------------------------------------- */
  // Far away, unlit, half-lost in fog. This is what gives the sea a horizon.
  const silhouetteCount = full ? 12 : 6;
  const silhouettes: Placement[] = [];
  for (let index = 0; index < silhouetteCount; index += 1) {
    const angle = (index / silhouetteCount) * Math.PI * 2 + 0.4;
    const radius = randomBetween(random, 44, 66);
    silhouettes.push({
      position: [Math.cos(angle) * radius, -2.3, Math.sin(angle) * radius],
      rotation: [0, angle, 0],
      scale: [randomBetween(random, 3, 7), randomBetween(random, 3.5, 11), randomBetween(random, 3, 7)]
    });
  }
  addInstances(context, group, "silhouette", shape.cone(1, 1, 5), "stoneDark", silhouettes);

  /* ---- Frame ----------------------------------------------------------- */
  return {
    group,
    update(delta, elapsed) {
      void delta;

      swells.forEach(({ mesh, phase, speed }) => {
        const wave = Math.sin(elapsed * speed + phase);
        mesh.scale.setScalar(1 + wave * 0.008);
        const material = mesh.material as THREE.MeshStandardMaterial;
        material.emissiveIntensity = 0.5 + wave * 0.2;
      });
    }
  };
}

/**
 * Curved approach from the hub to a landmark.
 *
 * The control point is pushed perpendicular to the direct line, so paths sweep
 * around the hub instead of cutting through it.
 */
function buildPathCurve(to: readonly [number, number, number], bend: number): THREE.CatmullRomCurve3 {
  const start = new THREE.Vector3(0, 0, 0);
  const end = new THREE.Vector3(to[0], 0, to[2]);
  const mid = start.clone().lerp(end, 0.5);

  const direction = end.clone().sub(start).normalize();
  const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x).multiplyScalar(bend * 1.35);

  return new THREE.CatmullRomCurve3([start.clone(), mid.clone().add(perpendicular), end.clone()]);
}

/** A small stone arch over the southern channel. */
function buildBridge(context: BuildContext, parent: THREE.Group) {
  const bridge = new THREE.Group();
  bridge.position.set(0.4, PLATEAU_Y, 8.8);
  bridge.rotation.y = 0.06;

  const deckSegments = 3;
  for (let index = 0; index < deckSegments; index += 1) {
    const t = index / (deckSegments - 1);
    const arch = Math.sin(t * Math.PI) * 0.28;

    addMesh(
      context,
      bridge,
      "bridge-deck",
      shape.box(1.9, 0.09, 0.86),
      "stoneLight",
      { position: [(t - 0.5) * 1.9, 0.12 + arch, 0], rotation: [0, 0, (t - 0.5) * -0.24] },
      { castShadow: true, receiveShadow: true }
    );
  }

  [-0.46, 0.46].forEach((offset) => {
    addMesh(context, bridge, "bridge-rail", shape.box(2.1, 0.06, 0.06), "stone", {
      position: [0, 0.44, offset]
    });

    for (let index = -1; index <= 1; index += 1) {
      addMesh(context, bridge, "bridge-post", shape.box(0.07, 0.34, 0.07), "stone", {
        position: [index * 0.85, 0.28, offset]
      });
    }
  });

  // The channel the bridge crosses: a thin dark recess in the plateau.
  addMesh(context, parent, "channel", shape.box(2.8, 0.1, 5.6), "water", {
    position: [0.4, PLATEAU_Y + 0.03, 8.8]
  });

  parent.add(bridge);
}
