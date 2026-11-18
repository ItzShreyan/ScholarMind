import * as THREE from "three";
import type { WorldMaterialKey, WorldMaterials } from "@/components/world/landing/worldMaterials";

/**
 * The primitive layer every other builder writes through.
 *
 * Two rules make the campus affordable:
 *   - geometry is requested by key and cached, so forty identical columns are
 *     one `CylinderGeometry`, not forty
 *   - any set of identical meshes becomes an `InstancedMesh`, so repetition
 *     costs draw calls rather than objects
 *
 * Disposal is exhaustive by construction: the context owns every geometry it
 * ever created, so `disposeBuildContext` cannot miss one.
 */

export type BuildContext = {
  materials: WorldMaterials;
  /** Cached geometry, keyed by a caller-chosen name. */
  geometries: Map<string, THREE.BufferGeometry>;
  /** Scratch object used to compose instance matrices. */
  dummy: THREE.Object3D;
};

export type Placement = {
  position?: readonly [number, number, number];
  rotation?: readonly [number, number, number];
  scale?: number | readonly [number, number, number];
};

export function createBuildContext(materials: WorldMaterials): BuildContext {
  return {
    materials,
    geometries: new Map(),
    dummy: new THREE.Object3D()
  };
}

/** Returns a cached geometry, creating it on first request. */
export function geometryFor(
  context: BuildContext,
  key: string,
  factory: () => THREE.BufferGeometry
): THREE.BufferGeometry {
  const existing = context.geometries.get(key);
  if (existing) return existing;

  const geometry = factory();
  context.geometries.set(key, geometry);
  return geometry;
}

function applyPlacement(object: THREE.Object3D, placement: Placement | undefined) {
  if (!placement) return;

  if (placement.position) {
    object.position.set(placement.position[0], placement.position[1], placement.position[2]);
  }

  if (placement.rotation) {
    object.rotation.set(placement.rotation[0], placement.rotation[1], placement.rotation[2]);
  }

  if (placement.scale !== undefined) {
    if (typeof placement.scale === "number") {
      object.scale.setScalar(placement.scale);
    } else {
      object.scale.set(placement.scale[0], placement.scale[1], placement.scale[2]);
    }
  }
}

/**
 * A material reference: either a key into the shared palette, or a material
 * owned by the caller (each building has one accent material of its own so the
 * scroll timeline can spotlight it independently).
 */
export type MaterialRef = WorldMaterialKey | THREE.Material;

function resolveMaterial(context: BuildContext, ref: MaterialRef): THREE.Material {
  return typeof ref === "string" ? context.materials.map[ref] : ref;
}

/** Adds one mesh built from a cached geometry. */
export function addMesh(
  context: BuildContext,
  parent: THREE.Object3D,
  geometryKey: string,
  factory: () => THREE.BufferGeometry,
  material: MaterialRef,
  placement: Placement = {},
  options: { castShadow?: boolean; receiveShadow?: boolean } = {}
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometryFor(context, geometryKey, factory), resolveMaterial(context, material));

  applyPlacement(mesh, placement);
  mesh.castShadow = options.castShadow ?? false;
  mesh.receiveShadow = options.receiveShadow ?? false;

  parent.add(mesh);
  return mesh;
}

/**
 * Adds one `InstancedMesh` for a repeated element.
 *
 * `placements` is an array of transforms; the geometry and material are shared
 * across all of them, so N lanterns cost one geometry, one material, one draw.
 */
export function addInstances(
  context: BuildContext,
  parent: THREE.Object3D,
  geometryKey: string,
  factory: () => THREE.BufferGeometry,
  material: MaterialRef,
  placements: Placement[],
  options: { castShadow?: boolean; receiveShadow?: boolean } = {}
): THREE.InstancedMesh | null {
  if (placements.length === 0) return null;

  const geometry = geometryFor(context, geometryKey, factory);
  const instanced = new THREE.InstancedMesh(geometry, resolveMaterial(context, material), placements.length);
  instanced.castShadow = options.castShadow ?? false;
  instanced.receiveShadow = options.receiveShadow ?? false;

  placements.forEach((placement, index) => {
    context.dummy.position.set(0, 0, 0);
    context.dummy.rotation.set(0, 0, 0);
    context.dummy.scale.set(1, 1, 1);
    applyPlacement(context.dummy, placement);
    context.dummy.updateMatrix();
    instanced.setMatrixAt(index, context.dummy.matrix);
  });

  instanced.instanceMatrix.needsUpdate = true;
  parent.add(instanced);
  return instanced;
}

/* -------------------------------------------------------------------------- */
/* Shorthands for the shape vocabulary the campus actually uses                */
/* -------------------------------------------------------------------------- */

export const shape = {
  box: (w: number, h: number, d: number) => () => new THREE.BoxGeometry(w, h, d),
  cylinder: (top: number, bottom: number, height: number, segments = 16) => () =>
    new THREE.CylinderGeometry(top, bottom, height, segments),
  sphere: (radius: number, width = 16, height = 12) => () =>
    new THREE.SphereGeometry(radius, width, height),
  hemisphere: (radius: number, width = 20, height = 12) => () =>
    new THREE.SphereGeometry(radius, width, height, 0, Math.PI * 2, 0, Math.PI / 2),
  cone: (radius: number, height: number, segments = 12) => () =>
    new THREE.ConeGeometry(radius, height, segments),
  torus: (radius: number, tube: number, radial = 8, tubular = 28) => () =>
    new THREE.TorusGeometry(radius, tube, radial, tubular),
  circle: (radius: number, segments = 48) => () => new THREE.CircleGeometry(radius, segments),
  plane: (w: number, h: number) => () => new THREE.PlaneGeometry(w, h)
};

/** Convenience: a round ring lying flat on the ground. */
export const FLAT_RING: readonly [number, number, number] = [Math.PI / 2, 0, 0];

/** Convenience: a plane lying flat. */
export const FLAT_PLANE: readonly [number, number, number] = [-Math.PI / 2, 0, 0];

export function disposeBuildContext(context: BuildContext) {
  context.geometries.forEach((geometry) => geometry.dispose());
  context.geometries.clear();
}
