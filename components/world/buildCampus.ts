import * as THREE from "three";

/**
 * Procedural geometry for the ScholarMind learning campus.
 *
 * Everything here is generated at runtime from primitives — there are no model
 * files, no textures and no external assets, so nothing can fail to load or
 * disappear from a CDN. The whole campus is a few thousand triangles with flat
 * PBR materials; the sense of place comes from silhouette, lighting and fog
 * rather than surface detail.
 *
 * Layout (world units, y up, island radius 7.6):
 *
 *              observatory            practice hall
 *              (-3.15, -1.5)          (3.2, -1.35)
 *
 *                     learning hub (0, 0)
 *
 *              library                revision garden
 *              (-2.65, 2.4)           (2.55, 2.45)
 */

export type Campus = {
  /** Everything except the lights, so the caller can hide/show the campus. */
  group: THREE.Group;
  lights: THREE.Group;
  /** Anchor points per space, already lifted to the label height. */
  anchors: Record<string, THREE.Vector3>;
  /** Releases every geometry, material and texture created here. */
  dispose: () => void;
};

/* -------------------------------------------------------------------------- */
/* Palette — mirrors the design tokens in globals.css                          */
/* -------------------------------------------------------------------------- */

const COLOR = {
  ground: 0x0b1219,
  groundHigh: 0x141e28,
  soil: 0x1a232c,
  stone: 0x2b3843,
  stoneLight: 0x3d4c58,
  ivory: 0xe8e2d6,
  amber: 0xdca566,
  blue: 0x88b7ce,
  mint: 0x8fc2ac,
  gold: 0xe9ce9a,
  foliage: 0x3c5a4c,
  water: 0x0f1c26
} as const;

type Materials = {
  stone: THREE.MeshStandardMaterial;
  stoneLight: THREE.MeshStandardMaterial;
  ivory: THREE.MeshStandardMaterial;
  soil: THREE.MeshStandardMaterial;
  ground: THREE.MeshStandardMaterial;
  foliage: THREE.MeshStandardMaterial;
  water: THREE.MeshStandardMaterial;
  amberGlow: THREE.MeshStandardMaterial;
  blueGlow: THREE.MeshStandardMaterial;
  mintGlow: THREE.MeshStandardMaterial;
  goldGlow: THREE.MeshStandardMaterial;
};

function createMaterials(disposables: Set<THREE.Material>): Materials {
  const matte = (color: number, roughness: number) => {
    const material = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.02 });
    disposables.add(material);
    return material;
  };

  const glow = (color: number) => {
    const material = new THREE.MeshStandardMaterial({
      color,
      emissive: new THREE.Color(color),
      emissiveIntensity: 1.15,
      roughness: 0.5,
      metalness: 0
    });
    disposables.add(material);
    return material;
  };

  return {
    stone: matte(COLOR.stone, 0.88),
    stoneLight: matte(COLOR.stoneLight, 0.82),
    ivory: matte(COLOR.ivory, 0.72),
    soil: matte(COLOR.soil, 0.95),
    ground: matte(COLOR.groundHigh, 0.94),
    foliage: matte(COLOR.foliage, 0.9),
    water: (() => {
      const material = new THREE.MeshStandardMaterial({
        color: COLOR.water,
        roughness: 0.22,
        metalness: 0.45
      });
      disposables.add(material);
      return material;
    })(),
    amberGlow: glow(COLOR.amber),
    blueGlow: glow(COLOR.blue),
    mintGlow: glow(COLOR.mint),
    goldGlow: glow(COLOR.gold)
  };
}

/* -------------------------------------------------------------------------- */
/* Small builders                                                             */
/* -------------------------------------------------------------------------- */

type BuildContext = {
  disposables: Set<THREE.BufferGeometry>;
  materials: Materials;
};

/**
 * Adds a mesh built from `geometry` to `parent`.
 *
 * Geometry is tracked for disposal. A shared geometry can be passed to several
 * meshes — it is only ever disposed once because the set is keyed by identity.
 */
function add(
  context: BuildContext,
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  position: [number, number, number] = [0, 0, 0],
  rotation: [number, number, number] = [0, 0, 0]
): THREE.Mesh {
  context.disposables.add(geometry);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(position[0], position[1], position[2]);
  mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
  parent.add(mesh);
  return mesh;
}

/** A ring of columns around `radius`, all sharing one geometry. */
function addColonnade(
  context: BuildContext,
  parent: THREE.Object3D,
  options: {
    count: number;
    radius: number;
    height: number;
    thickness: number;
    baseY: number;
    material: THREE.Material;
    startAngle?: number;
  }
): void {
  const geometry = new THREE.CylinderGeometry(
    options.thickness,
    options.thickness * 1.08,
    options.height,
    7
  );
  const start = options.startAngle ?? 0;

  for (let index = 0; index < options.count; index += 1) {
    const angle = start + (index / options.count) * Math.PI * 2;
    add(
      context,
      parent,
      geometry,
      options.material,
      [
        Math.cos(angle) * options.radius,
        options.baseY + options.height / 2,
        Math.sin(angle) * options.radius
      ]
    );
  }
}

/* -------------------------------------------------------------------------- */
/* Buildings                                                                  */
/* -------------------------------------------------------------------------- */

/** Central hexagonal pavilion. Tallest silhouette — it is the destination. */
function buildHub(context: BuildContext, x: number, z: number): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  add(context, group, new THREE.CylinderGeometry(1.62, 1.78, 0.26, 6), context.materials.stone, [0, 0.13, 0]);
  add(context, group, new THREE.CylinderGeometry(1.3, 1.3, 0.04, 6), context.materials.stoneLight, [0, 0.28, 0]);

  addColonnade(context, group, {
    count: 6,
    radius: 1.22,
    height: 1.62,
    thickness: 0.1,
    baseY: 0.28,
    material: context.materials.ivory
  });

  // Warm light spilling out from under the roof — the "someone is studying
  // here" signal, and the brightest thing in the scene.
  const ring = add(
    context,
    group,
    new THREE.TorusGeometry(1.2, 0.035, 8, 32),
    context.materials.amberGlow,
    [0, 1.74, 0],
    [Math.PI / 2, 0, 0]
  );
  ring.rotation.z = 0;

  add(context, group, new THREE.ConeGeometry(2.0, 1.0, 6), context.materials.stone, [0, 2.42, 0]);
  add(context, group, new THREE.ConeGeometry(1.98, 0.06, 6), context.materials.stoneLight, [0, 1.94, 0]);
  add(context, group, new THREE.SphereGeometry(0.14, 12, 10), context.materials.goldGlow, [0, 3.0, 0]);

  const light = new THREE.PointLight(COLOR.amber, 9, 11, 1.6);
  light.position.set(0, 1.5, 0);
  group.add(light);

  return group;
}

/** Round library with a dome, cupola and lit reading windows. */
function buildLibrary(context: BuildContext, x: number, z: number): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  add(context, group, new THREE.CylinderGeometry(1.3, 1.42, 0.22, 18), context.materials.stoneLight, [0, 0.11, 0]);
  add(context, group, new THREE.CylinderGeometry(1.02, 1.14, 1.5, 20), context.materials.ivory, [0, 0.97, 0]);
  add(context, group, new THREE.CylinderGeometry(1.16, 1.16, 0.08, 20), context.materials.stone, [0, 1.76, 0]);

  // Dome: a hemisphere, capped with a small lit cupola.
  add(
    context,
    group,
    new THREE.SphereGeometry(1.04, 22, 11, 0, Math.PI * 2, 0, Math.PI / 2),
    context.materials.stone,
    [0, 1.8, 0]
  );
  add(context, group, new THREE.CylinderGeometry(0.15, 0.2, 0.34, 10), context.materials.stoneLight, [0, 2.95, 0]);
  add(context, group, new THREE.SphereGeometry(0.13, 12, 10), context.materials.amberGlow, [0, 3.16, 0]);

  addColonnade(context, group, {
    count: 10,
    radius: 1.24,
    height: 1.44,
    thickness: 0.065,
    baseY: 0.22,
    material: context.materials.stoneLight
  });

  // Lit windows: one emissive panel per bay, alternating so the building reads
  // as occupied rather than uniformly glowing.
  const windowGeometry = new THREE.BoxGeometry(0.2, 0.52, 0.03);
  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2 + 0.2;
    const material = index % 3 === 0 ? context.materials.amberGlow : context.materials.goldGlow;
    add(
      context,
      group,
      windowGeometry.clone(),
      material,
      [Math.cos(angle) * 1.09, 1.0, Math.sin(angle) * 1.09],
      [0, -angle + Math.PI / 2, 0]
    );
  }

  return group;
}

/** Slim observatory with an open dome slit and a tilted telescope. */
function buildObservatory(context: BuildContext, x: number, z: number): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  add(context, group, new THREE.CylinderGeometry(1.0, 1.12, 0.2, 14), context.materials.stoneLight, [0, 0.1, 0]);
  add(context, group, new THREE.CylinderGeometry(0.8, 0.9, 1.05, 14), context.materials.ivory, [0, 0.72, 0]);
  add(
    context,
    group,
    new THREE.SphereGeometry(0.82, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    context.materials.stone,
    [0, 1.25, 0]
  );

  // The slit is what makes this read as an observatory rather than a bunker.
  add(context, group, new THREE.BoxGeometry(0.16, 0.95, 0.05), context.materials.blueGlow, [0, 1.62, 0.44], [0.32, 0, 0]);

  const telescope = new THREE.Group();
  telescope.position.set(0, 1.26, 0);
  telescope.rotation.set(-0.62, 0.7, 0);
  add(context, telescope, new THREE.CylinderGeometry(0.085, 0.11, 1.15, 10), context.materials.stoneLight, [0, 0.45, 0]);
  add(context, telescope, new THREE.CylinderGeometry(0.055, 0.055, 0.2, 8), context.materials.blueGlow, [0, 1.06, 0]);
  group.add(telescope);

  const light = new THREE.PointLight(COLOR.blue, 5, 9, 1.7);
  light.position.set(0, 1.5, 0);
  group.add(light);

  return group;
}

/** Amphitheatre-ish practice hall: stepped seating under a colonnade. */
function buildPracticeHall(context: BuildContext, x: number, z: number): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  add(context, group, new THREE.CylinderGeometry(1.72, 1.86, 0.18, 22), context.materials.stone, [0, 0.09, 0]);
  add(context, group, new THREE.CylinderGeometry(1.36, 1.5, 0.2, 22), context.materials.stoneLight, [0, 0.28, 0]);
  add(context, group, new THREE.CylinderGeometry(1.0, 1.14, 0.2, 22), context.materials.stone, [0, 0.48, 0]);
  add(context, group, new THREE.CylinderGeometry(0.68, 0.78, 0.22, 22), context.materials.mintGlow, [0, 0.69, 0]);

  addColonnade(context, group, {
    count: 12,
    radius: 1.56,
    height: 1.22,
    thickness: 0.06,
    baseY: 0.18,
    material: context.materials.ivory
  });

  add(
    context,
    group,
    new THREE.TorusGeometry(1.58, 0.075, 8, 30),
    context.materials.stoneLight,
    [0, 1.42, 0],
    [Math.PI / 2, 0, 0]
  );
  add(
    context,
    group,
    new THREE.TorusGeometry(1.58, 0.02, 6, 30),
    context.materials.mintGlow,
    [0, 1.5, 0],
    [Math.PI / 2, 0, 0]
  );

  const light = new THREE.PointLight(COLOR.mint, 4.5, 9, 1.7);
  light.position.set(0, 1.2, 0);
  group.add(light);

  return group;
}

/** Terraced planting beds, trellis arches and a lamp — the calm corner. */
function buildRevisionGarden(context: BuildContext, x: number, z: number): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  // Three stepped beds, each offset so the terraces read as a slope.
  const beds: Array<[number, number, number]> = [
    [-0.85, 0.12, -0.55],
    [0.15, 0.24, 0.05],
    [1.05, 0.36, 0.6]
  ];
  beds.forEach(([bx, by, bz]) => {
    add(context, group, new THREE.BoxGeometry(1.5, 0.2, 0.85), context.materials.stoneLight, [bx, by - 0.1, bz]);
    add(context, group, new THREE.BoxGeometry(1.44, 0.1, 0.79), context.materials.foliage, [bx, by + 0.02, bz]);
  });

  // Trellis arches.
  for (let index = 0; index < 2; index += 1) {
    const archX = -1.05 + index * 1.5;
    add(context, group, new THREE.BoxGeometry(0.05, 0.95, 0.05), context.materials.ivory, [archX, 0.48, 1.05]);
    add(context, group, new THREE.BoxGeometry(0.05, 0.95, 0.05), context.materials.ivory, [archX + 0.6, 0.48, 1.05]);
    add(context, group, new THREE.BoxGeometry(0.7, 0.05, 0.05), context.materials.ivory, [archX + 0.3, 0.95, 1.05]);
  }

  // A few trees: shared trunk and crown geometry.
  const trunkGeometry = new THREE.CylinderGeometry(0.035, 0.05, 0.34, 6);
  const crownGeometry = new THREE.ConeGeometry(0.24, 0.62, 7);
  const treePositions: Array<[number, number]> = [
    [-1.5, -0.9],
    [-1.05, 1.35],
    [1.7, -1.0],
    [1.85, 1.15],
    [0.05, -1.35]
  ];
  treePositions.forEach(([tx, tz]) => {
    add(context, group, trunkGeometry.clone(), context.materials.stoneLight, [tx, 0.17, tz]);
    add(context, group, crownGeometry.clone(), context.materials.foliage, [tx, 0.62, tz]);
  });

  // A single lamp so the garden is not the darkest place on the island.
  add(context, group, new THREE.CylinderGeometry(0.03, 0.04, 0.9, 6), context.materials.stoneLight, [-1.55, 0.45, 0.35]);
  add(context, group, new THREE.SphereGeometry(0.09, 10, 8), context.materials.amberGlow, [-1.55, 0.95, 0.35]);
  const lampLight = new THREE.PointLight(COLOR.amber, 2.2, 6, 1.8);
  lampLight.position.set(-1.55, 0.95, 0.35);
  group.add(lampLight);

  return group;
}

/* -------------------------------------------------------------------------- */
/* Ground, paths, water                                                       */
/* -------------------------------------------------------------------------- */

function buildIsland(context: BuildContext): THREE.Group {
  const group = new THREE.Group();

  add(context, group, new THREE.CylinderGeometry(7.6, 6.9, 1.3, 56), context.materials.soil, [0, -0.71, 0]);
  add(context, group, new THREE.CylinderGeometry(7.62, 7.6, 0.24, 56), context.materials.ground, [0, -0.12, 0]);
  add(context, group, new THREE.CylinderGeometry(7.4, 7.4, 0.03, 56), context.materials.stone, [0, 0.0, 0]);

  // A lighter inner clearing keeps the buildings from floating on flat colour.
  add(context, group, new THREE.CylinderGeometry(4.7, 4.7, 0.02, 48), context.materials.stoneLight, [0, 0.015, 0]);

  const water = new THREE.Mesh(new THREE.CircleGeometry(34, 48), context.materials.water);
  context.disposables.add(water.geometry);
  water.rotation.x = -Math.PI / 2;
  water.position.y = -1.55;
  group.add(water);

  return group;
}

/** Thin stone paths from the hub to each building. */
function buildPaths(context: BuildContext): THREE.Group {
  const group = new THREE.Group();
  const geometry = new THREE.BoxGeometry(0.62, 0.03, 1);

  const routes: Array<[number, number, number]> = [
    [-1.6, -0.75, Math.atan2(-1.6, -0.75)],
    [1.62, -0.68, Math.atan2(1.62, -0.68)],
    [-1.35, 1.2, Math.atan2(-1.35, 1.2)],
    [1.3, 1.22, Math.atan2(1.3, 1.22)]
  ];

  routes.forEach(([px, pz, _angle]) => {
    const length = Math.hypot(px, pz);
    const mesh = new THREE.Mesh(geometry.clone(), context.materials.stoneLight);
    context.disposables.add(mesh.geometry);
    mesh.position.set(px / 2, 0.035, pz / 2);
    mesh.rotation.y = Math.atan2(pz, px) - Math.PI / 2;
    mesh.scale.z = length;
    group.add(mesh);
  });

  return group;
}

/** A sparse drift of warm motes. Cheap (one Points object) and very effective. */
function buildMotes(): { points: THREE.Points; geometry: THREE.BufferGeometry; material: THREE.PointsMaterial } {
  const count = 140;
  const positions = new Float32Array(count * 3);

  for (let index = 0; index < count; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 1.6 + Math.random() * 5.6;
    positions[index * 3] = Math.cos(angle) * radius;
    positions[index * 3 + 1] = 0.35 + Math.random() * 3.2;
    positions[index * 3 + 2] = Math.sin(angle) * radius;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: COLOR.gold,
    size: 0.035,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    sizeAttenuation: true
  });

  return { points: new THREE.Points(geometry, material), geometry, material };
}

/* -------------------------------------------------------------------------- */
/* Entry point                                                                */
/* -------------------------------------------------------------------------- */

export function buildCampus(): Campus {
  const disposables = new Set<THREE.Material>();
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = createMaterials(disposables);
  const context: BuildContext = { disposables: geometries, materials };

  const group = new THREE.Group();

  group.add(buildIsland(context));
  group.add(buildPaths(context));
  group.add(buildRevisionGarden(context, 2.55, 2.45));
  group.add(buildPracticeHall(context, 3.2, -1.35));
  group.add(buildObservatory(context, -3.15, -1.5));
  group.add(buildLibrary(context, -2.65, 2.4));
  group.add(buildHub(context, 0, 0));

  const motes = buildMotes();
  group.add(motes.points);

  /* Lighting. Restrained: one warm key, one cool fill, one ambient floor. */
  const lights = new THREE.Group();

  const ambient = new THREE.AmbientLight(0x24313d, 0.85);
  const hemisphere = new THREE.HemisphereLight(COLOR.blue, COLOR.ground, 0.55);

  const key = new THREE.DirectionalLight(COLOR.amber, 1.85);
  key.position.set(5.5, 7.5, 4.5);

  const rim = new THREE.PointLight(COLOR.blue, 5.5, 22, 1.4);
  rim.position.set(-6.5, 4.2, -5.5);

  const fill = new THREE.PointLight(COLOR.mint, 2.6, 16, 1.6);
  fill.position.set(6.2, 3.0, 2.5);

  lights.add(ambient, hemisphere, key, rim, fill);

  const anchors: Record<string, THREE.Vector3> = {
    hub: new THREE.Vector3(0, 3.1, 0),
    library: new THREE.Vector3(-2.65, 3.3, 2.4),
    observatory: new THREE.Vector3(-3.15, 2.5, -1.5),
    practice: new THREE.Vector3(3.2, 2.3, -1.35),
    garden: new THREE.Vector3(2.55, 1.75, 2.45)
  };

  return {
    group,
    lights,
    anchors,
    dispose() {
      group.traverse((child) => {
        if (child instanceof THREE.Mesh || child instanceof THREE.Points) {
          child.geometry?.dispose?.();
        }
      });
      motes.geometry.dispose();
      motes.material.dispose();
      disposables.forEach((material) => material.dispose());
      geometries.forEach((geometry) => geometry.dispose());
      disposables.clear();
      geometries.clear();
    }
  };
}
