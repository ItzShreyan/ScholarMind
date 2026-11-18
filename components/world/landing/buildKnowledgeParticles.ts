import * as THREE from "three";
import {
  createSeededRandom,
  clamp01,
  randomBetween,
  smoothstep
} from "@/components/world/landing/worldMath";
import { LANDMARK_ORIGIN } from "@/components/world/landing/worldMaterials";
import {
  PARTICLE_CONFIG,
  worldPointer,
  type KnowledgeParticle,
  type ParticleRole
} from "@/components/world/landing/worldTypes";

/**
 * The knowledge particles — the Gravity physics adapted to the campus.
 *
 * Each particle is an idea in flight. It holds a target for every stage, and the
 * frame loop blends between those targets with normalised weights, so a
 * transition is always a weighted average of both formations rather than one
 * formation being overwritten by the next.
 *
 * Rendering: four `InstancedMesh` objects (one per role). A sphere looks the
 * same from every angle, so per-particle rotation buys nothing, and 96 spheres
 * as instances cost four draw calls instead of ninety-six.
 */

export type KnowledgeParticleSystem = {
  group: THREE.Group;
  particles: KnowledgeParticle[];
  /**
   * `camera` is needed to turn the normalised pointer position into a world
   * point the particles can be repelled from.
   */
  update: (delta: number, elapsed: number, progress: number, camera: THREE.Camera) => void;
  /** Releases the entrance clamp, letting the particles fly to their orbit. */
  startEntrance: () => void;
  dispose: () => void;
};

const ROLES: readonly ParticleRole[] = ["amber", "blue", "mint", "glass"];

/** Particles start clustered at the hub and spread out on first release. */
const ENTRANCE_ORIGIN = new THREE.Vector3(0, 3.4, 0);

/** Radius beyond which a particle is considered escaped and pulled back. */
const MAX_ORBIT_RADIUS = 26;

export function getParticleRadius(random: number): number {
  if (random < 0.3) return 0.075 + random * 0.05;
  if (random < 0.8) return 0.12 + random * 0.06;
  return 0.17 + random * 0.05;
}

/**
 * Even distribution on a sphere (golden-angle spiral). Used for the opening
 * orbit, then lifted clear of the rooftops.
 */
export function assignOrbitTarget(
  index: number,
  count: number,
  target: THREE.Vector3,
  radius: number
): THREE.Vector3 {
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const angle = index * goldenAngle;
  const vertical = 1 - (index / Math.max(1, count - 1)) * 2;
  const horizontalRadius = Math.sqrt(Math.max(0, 1 - vertical * vertical));

  target.set(
    Math.cos(angle) * horizontalRadius * radius,
    vertical * radius * 0.6,
    Math.sin(angle) * horizontalRadius * radius
  );

  return target;
}

/* -------------------------------------------------------------------------- */
/* Target formations                                                           */
/* -------------------------------------------------------------------------- */

/** A stream of particles running along the approach to the library. */
function buildLibraryStreamCurve(): THREE.CatmullRomCurve3 {
  const target = LANDMARK_ORIGIN.library;

  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(target[0] * 0.25, 3.2, target[2] * 0.25),
    new THREE.Vector3(target[0] * 0.55, 4.6, target[2] * 0.55 + 1.6),
    new THREE.Vector3(target[0] * 0.86, 4.1, target[2] * 0.86),
    new THREE.Vector3(target[0], 4.4, target[2])
  ]);
}

/**
 * The observatory's knowledge network: fixed nodes on a shallow dome above the
 * building. Explicit coordinates rather than random scatter, so the lines
 * between them read as a considered diagram.
 */
function buildNetworkNodes(count: number): THREE.Vector3[] {
  const centre = new THREE.Vector3(
    LANDMARK_ORIGIN.observatory[0],
    6.2,
    LANDMARK_ORIGIN.observatory[2]
  );

  const nodes: THREE.Vector3[] = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  for (let index = 0; index < count; index += 1) {
    const vertical = 1 - (index / Math.max(1, count - 1)) * 2;
    const horizontalRadius = Math.sqrt(Math.max(0, 1 - vertical * vertical));
    const angle = index * goldenAngle;

    // Flattened into a dome rather than a sphere: a network has a "top".
    nodes.push(
      new THREE.Vector3(
        centre.x + Math.cos(angle) * horizontalRadius * 3.4,
        centre.y + vertical * 1.5 + 1.2,
        centre.z + Math.sin(angle) * horizontalRadius * 3.4
      )
    );
  }

  return nodes;
}

/** Nodes that sit near the camera-facing edge of the network, for the lines. */
function buildNetworkLinks(nodes: THREE.Vector3[]): Array<[number, number]> {
  const links: Array<[number, number]> = [];

  nodes.forEach((from, index) => {
    nodes.forEach((to, other) => {
      if (other <= index) return;
      if (from.distanceToSquared(to) < 2.6) links.push([index, other]);
    });
  });

  return links.slice(0, 90);
}

/* -------------------------------------------------------------------------- */
/* Builder                                                                     */
/* -------------------------------------------------------------------------- */

export function buildKnowledgeParticles(options: {
  count: number;
  allowTransmission: boolean;
  reducedMotion: boolean;
}): KnowledgeParticleSystem {
  const group = new THREE.Group();
  group.name = "knowledge-particles";

  const random = createSeededRandom(0x1dca7531);
  const count = options.count;

  /* ---- Shared geometry and per-role materials ------------------------- */
  const geometry = new THREE.SphereGeometry(1, PARTICLE_CONFIG.geometrySegments, PARTICLE_CONFIG.geometrySegments);

  const roleMaterials: Record<ParticleRole, THREE.MeshPhysicalMaterial> = {
    amber: new THREE.MeshPhysicalMaterial({
      color: 0xdca566,
      roughness: 0.36,
      metalness: 0.04,
      clearcoat: 0.55,
      clearcoatRoughness: 0.3,
      emissive: 0xdca566,
      emissiveIntensity: 0.16
    }),
    blue: new THREE.MeshPhysicalMaterial({
      color: 0x88b7ce,
      roughness: 0.3,
      metalness: 0.08,
      clearcoat: 0.6,
      clearcoatRoughness: 0.25,
      emissive: 0x88b7ce,
      emissiveIntensity: 0.18
    }),
    mint: new THREE.MeshPhysicalMaterial({
      color: 0x8fc2ac,
      roughness: 0.34,
      metalness: 0.04,
      clearcoat: 0.5,
      clearcoatRoughness: 0.3,
      emissive: 0x8fc2ac,
      emissiveIntensity: 0.15
    }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0x88b7ce,
      roughness: 0.08,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
      transmission: options.allowTransmission ? 0.85 : 0,
      ior: 1.485,
      thickness: 0.8,
      transparent: true,
      opacity: options.allowTransmission ? 0.7 : 0.9,
      emissive: 0x88b7ce,
      emissiveIntensity: 0.1
    })
  };

  const materialsList = ROLES.map((role) => roleMaterials[role]);

  /* ---- Formations ----------------------------------------------------- */
  const libraryCurve = buildLibraryStreamCurve();
  const networkNodes = buildNetworkNodes(Math.max(12, Math.round(count * 0.45)));
  const networkLinks = buildNetworkLinks(networkNodes);

  const practiceCentre = new THREE.Vector3(
    LANDMARK_ORIGIN.practice[0],
    0,
    LANDMARK_ORIGIN.practice[2]
  );

  const particles: KnowledgeParticle[] = [];

  for (let index = 0; index < count; index += 1) {
    const isGlass = random() < PARTICLE_CONFIG.glassProbability;
    const role: ParticleRole = isGlass
      ? "glass"
      : (["amber", "blue", "mint"] as const)[index % 3];

    const radius = getParticleRadius(random());

    /* -- Orbit: a wide shell, lifted above the rooftops. */
    const orbitTarget = new THREE.Vector3();
    assignOrbitTarget(index, count, orbitTarget, randomBetween(random, 9.4, 13.6));
    orbitTarget.y = 2.0 + (orbitTarget.y + 8.2) * 0.52;

    /* -- Library: a stream along the approach path. */
    const libraryTarget = libraryCurve
      .getPointAt(clamp01((index % 24) / 24 + randomBetween(random, -0.02, 0.02)))
      .clone()
      .add(
        new THREE.Vector3(
          randomBetween(random, -0.9, 0.9),
          randomBetween(random, -0.7, 0.9),
          randomBetween(random, -0.9, 0.9)
        )
      );

    /* -- Network: a node in the constellation. */
    const networkTarget = networkNodes[index % networkNodes.length]
      .clone()
      .add(
        new THREE.Vector3(
          randomBetween(random, -0.16, 0.16),
          randomBetween(random, -0.16, 0.16),
          randomBetween(random, -0.16, 0.16)
        )
      );

    /* -- Practice: a ring of active recall around the amphitheatre. */
    const practiceAngle = (index / count) * Math.PI * 2 + randomBetween(random, -0.12, 0.12);
    const practiceRadius = randomBetween(random, 3.4, 5.0);
    const practiceTarget = new THREE.Vector3(
      practiceCentre.x + Math.cos(practiceAngle) * practiceRadius,
      randomBetween(random, 1.1, 3.6),
      practiceCentre.z + Math.sin(practiceAngle) * practiceRadius
    );

    /* -- Hub: the ScholarMind starburst. */
    const hubTarget = buildStarburstTarget(index, count, random);

    /* -- Start: clustered at the hub until the entrance releases them. */
    const position = ENTRANCE_ORIGIN.clone().add(
      new THREE.Vector3(
        randomBetween(random, -0.6, 0.6),
        randomBetween(random, -0.4, 0.4),
        randomBetween(random, -0.6, 0.6)
      )
    );

    particles.push({
      id: index,
      radius,
      mass: radius * radius * radius,
      position,
      velocity: new THREE.Vector3(),
      role,
      orbitTarget,
      libraryTarget,
      networkTarget,
      practiceTarget,
      hubTarget,
      rotationSpeed: randomBetween(random, 0.2, 0.9),
      phase: randomBetween(random, 0, Math.PI * 2)
    });
  }

  /* ---- Instanced meshes, one per role -------------------------------- */
  const roleIndex: Record<ParticleRole, number[]> = {
    amber: [],
    blue: [],
    mint: [],
    glass: []
  };
  particles.forEach((particle) => roleIndex[particle.role].push(particle.id));

  const instanced: Partial<Record<ParticleRole, THREE.InstancedMesh>> = {};

  ROLES.forEach((role) => {
    const ids = roleIndex[role];
    if (ids.length === 0) return;

    const mesh = new THREE.InstancedMesh(geometry, roleMaterials[role], ids.length);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    mesh.name = `knowledge-${role}`;
    group.add(mesh);
    instanced[role] = mesh;
  });

  /* ---- Constellation lines ------------------------------------------- */
  const linePositions = new Float32Array(networkLinks.length * 6);
  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x9fd0e4,
    transparent: true,
    opacity: 0,
    depthWrite: false
  });
  const constellation = new THREE.LineSegments(lineGeometry, lineMaterial);
  constellation.frustumCulled = false;
  group.add(constellation);

  /* ---- Scratch objects (allocation-free frame loop) ------------------- */
  const matrix = new THREE.Matrix4();
  const scaleVector = new THREE.Vector3();
  const target = new THREE.Vector3();
  const deltaVector = new THREE.Vector3();
  const pointerWorld = new THREE.Vector3();
  const pointerRay = new THREE.Vector3();
  const velocityAccumulator = new THREE.Vector3();

  let entrance = 0;
  let entranceTarget = 0;

  /* ---- Frame ---------------------------------------------------------- */

  const weights = {
    orbit: 0,
    library: 0,
    network: 0,
    practice: 0,
    hub: 0
  };

  function update(delta: number, elapsed: number, progress: number, camera: THREE.Camera) {
    const safeDelta = Math.min(delta, 0.05);
    const step = options.reducedMotion ? 0 : safeDelta * 60;

    entrance += (entranceTarget - entrance) * Math.min(1, safeDelta * 1.6);

    /* -- Formation weights --------------------------------------------- */
    // Each formation rises and falls; the orbit is the constant floor. Dividing
    // by the total keeps the blend a true weighted average, which is what stops
    // a transition from snapping when one weight overtakes another.
    weights.library = smoothstep(0.45, 1.05, progress) - smoothstep(1.5, 1.95, progress);
    weights.network = smoothstep(1.45, 2.05, progress) - smoothstep(2.55, 3.0, progress);
    weights.practice = smoothstep(2.5, 3.1, progress) - smoothstep(3.5, 3.95, progress);
    weights.hub = smoothstep(4.5, 5.0, progress);

    // The constellation stage re-uses the network formation but at full spread.
    const constellationBoost = smoothstep(3.5, 4.1, progress) - smoothstep(4.55, 4.95, progress);
    weights.network += constellationBoost;

    weights.orbit = Math.max(
      0.06,
      1 - (weights.library + weights.network + weights.practice + weights.hub)
    );

    const total = weights.orbit + weights.library + weights.network + weights.practice + weights.hub;

    /* -- Pointer, in world space --------------------------------------- */
    let pointerActive = false;
    if (worldPointer.active && worldPointer.x > -90) {
      pointerRay.set(worldPointer.x, worldPointer.y, 0.5).unproject(camera);
      pointerRay.sub(camera.position).normalize();

      // Project onto the plane through the island centre, facing the camera.
      const distance = Math.max(6, camera.position.length());
      pointerWorld.copy(camera.position).addScaledVector(pointerRay, distance);
      pointerActive = true;
    }

    const pointerStrength = worldPointer.isDown ? 1.7 : 1;
    const repelRadius = PARTICLE_CONFIG.mouseRepelRadius * (worldPointer.isDown ? 1.4 : 1);

    /* -- Upkeep -------------------------------------------------------- */
    particles.forEach((particle) => {
      /* Target: weighted average of the active formations. */
      target.set(0, 0, 0);
      target.addScaledVector(particle.orbitTarget, weights.orbit);
      target.addScaledVector(particle.libraryTarget, weights.library);
      target.addScaledVector(particle.networkTarget, weights.network);
      target.addScaledVector(particle.practiceTarget, weights.practice);
      target.addScaledVector(particle.hubTarget, weights.hub);
      target.multiplyScalar(1 / total);

      // During the entrance the particles are still gathered at the hub; easing
      // the pull toward their target is what makes them fly outward.
      deltaVector.subVectors(target, particle.position);

      // A light drift so a resting formation still breathes.
      const drift = options.reducedMotion ? 0 : 0.06;
      deltaVector.x += Math.sin(elapsed * 0.42 + particle.phase) * drift;
      deltaVector.y += Math.cos(elapsed * 0.37 + particle.phase * 1.3) * drift;
      deltaVector.z += Math.sin(elapsed * 0.31 + particle.phase * 0.7) * drift;

      // Spring toward the target, weakened by its own mass so big orbs move
      // slower than small ones — that alone reads as physical.
      const pull = (0.00024 + 0.0007 * (1 - clamp01(particle.mass * 40))) * (0.35 + entrance * 0.65);
      velocityAccumulator.copy(deltaVector).multiplyScalar(pull);

      /* Pointer repulsion. */
      if (pointerActive && !options.reducedMotion) {
        deltaVector.subVectors(particle.position, pointerWorld);
        const distanceSq = deltaVector.lengthSq();

        if (distanceSq < repelRadius * repelRadius && distanceSq > 0.0001) {
          const distance = Math.sqrt(distanceSq);
          const falloff = 1 - distance / repelRadius;
          const speedBoost = 1 + Math.min(3, worldPointer.speed) * 3.2;

          velocityAccumulator.addScaledVector(
            deltaVector.multiplyScalar(1 / distance),
            PARTICLE_CONFIG.mouseRepelForce * falloff * pointerStrength * speedBoost * 0.02
          );
        }
      }

      particle.velocity.add(velocityAccumulator.multiplyScalar(step));
      particle.velocity.multiplyScalar(Math.pow(PARTICLE_CONFIG.damping, step));
      particle.position.addScaledVector(particle.velocity, step);

      /* Bounded simulation: nothing may escape the island's atmosphere. */
      const radialSq =
        particle.position.x * particle.position.x + particle.position.z * particle.position.z;

      if (radialSq > MAX_ORBIT_RADIUS * MAX_ORBIT_RADIUS) {
        const shrink = MAX_ORBIT_RADIUS / Math.sqrt(radialSq);
        particle.position.x *= shrink;
        particle.position.z *= shrink;
        particle.velocity.multiplyScalar(0.5);
      }

      if (particle.position.y < -1.2) {
        particle.position.y = -1.2;
        particle.velocity.y = Math.abs(particle.velocity.y) * PARTICLE_CONFIG.bounciness;
      }

      if (particle.position.y > 22) {
        particle.position.y = 22;
        particle.velocity.y = -Math.abs(particle.velocity.y) * 0.3;
      }
    });

    /* -- Collisions ---------------------------------------------------- */
    if (!options.reducedMotion) {
      resolveCollisions(particles, PARTICLE_CONFIG.collisionSubsteps);
    }

    /* -- Write instance matrices --------------------------------------- */
    ROLES.forEach((role) => {
      const mesh = instanced[role];
      if (!mesh) return;

      const ids = roleIndex[role];
      for (let index = 0; index < ids.length; index += 1) {
        const particle = particles[ids[index]];
        const breathe = options.reducedMotion
          ? 1
          : 1 + Math.sin(elapsed * 0.8 + particle.phase) * 0.06;

        scaleVector.setScalar(particle.radius * breathe);
        matrix.makeScale(scaleVector.x, scaleVector.y, scaleVector.z);
        matrix.setPosition(particle.position);
        mesh.setMatrixAt(index, matrix);
      }

      mesh.instanceMatrix.needsUpdate = true;
    });

    /* -- Constellation lines ------------------------------------------- */
    const lineStrength = Math.max(weights.network, 0) / Math.max(1, total) + constellationBoost * 0.5;
    lineMaterial.opacity = clamp01(lineStrength * 0.9) * 0.55;

    if (lineMaterial.opacity > 0.02) {
      networkLinks.forEach(([from, to], linkIndex) => {
        const a = particles[from % particles.length].position;
        const b = particles[to % particles.length].position;

        linePositions[linkIndex * 6] = a.x;
        linePositions[linkIndex * 6 + 1] = a.y;
        linePositions[linkIndex * 6 + 2] = a.z;
        linePositions[linkIndex * 6 + 3] = b.x;
        linePositions[linkIndex * 6 + 4] = b.y;
        linePositions[linkIndex * 6 + 5] = b.z;
      });

      (lineGeometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
      constellation.visible = true;
    } else {
      constellation.visible = false;
    }
  }

  /* ---- Helpers -------------------------------------------------------- */

  /** Cheap O(n²) separation. With n ≤ 96 this is ~4.5k checks a frame. */
  function resolveCollisions(list: KnowledgeParticle[], substeps: number) {
    const iterations = Math.max(1, substeps);

    for (let iteration = 0; iteration < iterations; iteration += 1) {
      for (let i = 0; i < list.length; i += 1) {
        for (let j = i + 1; j < list.length; j += 1) {
          const a = list[i];
          const b = list[j];

          const dx = b.position.x - a.position.x;
          const dy = b.position.y - a.position.y;
          const dz = b.position.z - a.position.z;

          const minDistance = a.radius + b.radius;
          const distanceSq = dx * dx + dy * dy + dz * dz;

          if (distanceSq >= minDistance * minDistance || distanceSq < 1e-6) continue;

          const distance = Math.sqrt(distanceSq);
          const overlap = (minDistance - distance) * 0.5;
          const nx = dx / distance;
          const ny = dy / distance;
          const nz = dz / distance;

          a.position.x -= nx * overlap;
          a.position.y -= ny * overlap;
          a.position.z -= nz * overlap;
          b.position.x += nx * overlap;
          b.position.y += ny * overlap;
          b.position.z += nz * overlap;
        }
      }
    }
  }

  return {
    group,
    particles,
    update,
    startEntrance() {
      entranceTarget = 1;
    },
    dispose() {
      geometry.dispose();
      materialsList.forEach((material) => material.dispose());
      Object.values(instanced).forEach((mesh) => mesh?.dispose());
      lineGeometry.dispose();
      lineMaterial.dispose();
    }
  };
}

/**
 * The ScholarMind starburst: eight rays radiating from the hub lantern, each
 * carrying a few particles. Positions are deterministic so the shape is stable
 * across reloads.
 */
function buildStarburstTarget(
  index: number,
  count: number,
  random: () => number
): THREE.Vector3 {
  const rays = 8;
  const ray = index % rays;
  const step = Math.floor(index / rays);
  const maxSteps = Math.max(1, Math.ceil(count / rays) - 1);
  const spread = clamp01(step / maxSteps);

  const angle = (ray / rays) * Math.PI * 2 + Math.PI / 8;
  const distance = 0.7 + spread * 4.4;

  // Slight depth variation, so the burst is a shape in space rather than a
  // decal floating in front of the building.
  const depth = randomBetween(random, -0.55, 0.55) * (1 - spread * 0.5);

  return new THREE.Vector3(
    Math.cos(angle) * distance,
    5.4 + Math.sin(angle) * distance * 0.86,
    1.6 + depth + spread * 0.8
  );
}
