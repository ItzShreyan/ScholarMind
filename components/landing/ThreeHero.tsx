"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export function ThreeHero() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    mount.innerHTML = "";

    const getSceneHeight = () => {
      if (window.innerWidth < 640) return 340;
      if (window.innerWidth < 1024) return 420;
      return 520;
    };

    let compact = window.innerWidth < 768;
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog("#020617", 9, 18);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0.06, compact ? 6.3 : 6.7);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance"
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, compact ? 1.1 : 1.4));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.42;
    renderer.setSize(mount.clientWidth, getSceneHeight());
    mount.appendChild(renderer.domElement);

    const stage = new THREE.Group();
    scene.add(stage);

    const brainPivot = new THREE.Group();
    stage.add(brainPivot);

    const aura = new THREE.Mesh(
      new THREE.TorusGeometry(1.9, 0.04, 18, 160),
      new THREE.MeshBasicMaterial({
        color: "#ffffff",
        transparent: true,
        opacity: 0.24
      })
    );
    aura.rotation.x = Math.PI / 2.35;
    aura.rotation.y = Math.PI / 8;
    stage.add(aura);

    const outerRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.3, 0.05, 18, 180),
      new THREE.MeshBasicMaterial({
        color: "#39d0ff",
        transparent: true,
        opacity: 0.18
      })
    );
    outerRing.rotation.x = Math.PI / 3.3;
    outerRing.rotation.z = Math.PI / 12;
    stage.add(outerRing);

    const particleGeometry = new THREE.BufferGeometry();
    const particleCount = compact ? 90 : 170;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 11;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 7.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      color: "#f8fafc",
      size: compact ? 0.022 : 0.028,
      transparent: true,
      opacity: 0.92
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    const ambient = new THREE.AmbientLight("#ffffff", 1.9);
    const hemisphere = new THREE.HemisphereLight("#dbeafe", "#0f172a", 2.2);
    const keyLight = new THREE.DirectionalLight("#fff4dc", 3.4);
    keyLight.position.set(2.8, 2.6, 4.8);
    const fillLight = new THREE.PointLight("#39d0ff", 4.6, 18);
    fillLight.position.set(-2.8, 2.2, 4.2);
    const rimLight = new THREE.PointLight("#ff8f6b", 3.8, 16);
    rimLight.position.set(2.2, -2.1, 0.8);
    const backLight = new THREE.PointLight("#7cf0cf", 2.4, 14);
    backLight.position.set(0.4, 0.8, -4.4);
    scene.add(ambient, hemisphere, keyLight, fillLight, rimLight, backLight);

    let brainScene: THREE.Group | null = null;
    const disposables = new Set<THREE.BufferGeometry | THREE.Material | THREE.Texture>();
    const loader = new GLTFLoader();
    let cancelled = false;

    loader.load(
      "/models/human-brain/scene.gltf",
      (gltf) => {
        if (cancelled) return;

        const root = gltf.scene;
        const box = new THREE.Box3().setFromObject(root);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxAxis = Math.max(size.x, size.y, size.z);

        root.position.sub(center);
        root.scale.setScalar((compact ? 2.12 : 2.28) / maxAxis);
        root.rotation.x = -0.04;
        root.rotation.y = 0;
        root.rotation.z = 0;

        root.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return;

          child.geometry.computeVertexNormals();
          disposables.add(child.geometry);

          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((material) => {
            disposables.add(material);

            if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial) {
              material.roughness = 0.82;
              material.metalness = 0.02;
              material.envMapIntensity = 1.28;
              material.normalScale.set(0.92, 0.92);
              material.emissive = new THREE.Color("#120b11");
              material.emissiveIntensity = 0.16;
              material.needsUpdate = true;

              if (material.map) {
                material.map.colorSpace = THREE.SRGBColorSpace;
                disposables.add(material.map);
              }
              if (material.normalMap) {
                disposables.add(material.normalMap);
              }
              if (material.metalnessMap) {
                disposables.add(material.metalnessMap);
              }
              if (material.roughnessMap) {
                disposables.add(material.roughnessMap);
              }
            }
          });
        });

        brainScene = root;
        brainPivot.add(root);
      }
    );

    let pointerX = 0;
    let pointerY = 0;
    let scrollFactor = 0;

    const onMove = (event: MouseEvent) => {
      pointerX = (event.clientX / window.innerWidth) * 2 - 1;
      pointerY = (event.clientY / window.innerHeight) * 2 - 1;
    };

    const onScroll = () => {
      scrollFactor = Math.min(window.scrollY / 1600, 1);
    };

    const onResize = () => {
      compact = window.innerWidth < 768;
      const width = mount.clientWidth;
      const height = getSceneHeight();
      camera.aspect = width / height;
      camera.position.z = compact ? 6.3 : 6.7;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, compact ? 1.1 : 1.4));
      renderer.setSize(width, height);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("scroll", onScroll);
    window.addEventListener("resize", onResize);

    let rafId = 0;
    const animate = () => {
      const time = performance.now() * 0.001;

      aura.rotation.z += 0.0034;
      outerRing.rotation.z -= 0.0022;
      outerRing.rotation.y += 0.0012;
      particles.rotation.y += 0.0006;
      stage.position.y = -0.06 + Math.sin(time * 1.15) * 0.05 - scrollFactor * 0.07;
      stage.rotation.z = Math.sin(time * 0.55) * 0.014;

      brainPivot.position.x += (pointerX * 0.14 - brainPivot.position.x) * 0.04;
      brainPivot.position.y += ((-pointerY * 0.06) - brainPivot.position.y) * 0.04;
      brainPivot.rotation.x = -0.01 + pointerY * 0.06 + Math.sin(time * 0.45) * 0.012;
      brainPivot.rotation.z = pointerX * 0.05;

      if (brainScene) {
        brainScene.rotation.y += 0.0022;
      }

      const scale = 1 + scrollFactor * 0.04;
      brainPivot.scale.setScalar(scale);
      camera.position.z = (compact ? 6.3 : 6.7) - scrollFactor * 0.08;

      renderer.render(scene, camera);
      rafId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);

      renderer.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
      aura.geometry.dispose();
      (aura.material as THREE.Material).dispose();
      outerRing.geometry.dispose();
      (outerRing.material as THREE.Material).dispose();

      disposables.forEach((item) => item.dispose());

      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="panel panel-border relative overflow-hidden rounded-[34px] p-3 sm:p-4">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.88),rgba(7,16,35,0.9)_58%,rgba(2,6,23,0.94))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.18),transparent_24%),radial-gradient(circle_at_20%_18%,rgba(255,125,89,0.18),transparent_22%),radial-gradient(circle_at_80%_78%,rgba(56,189,248,0.18),transparent_22%),radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.04),transparent_38%)]" />
      <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_12%_18%,rgba(255,255,255,0.92)_0.8px,transparent_1.3px),radial-gradient(circle_at_72%_28%,rgba(255,255,255,0.76)_0.8px,transparent_1.3px),radial-gradient(circle_at_38%_68%,rgba(255,255,255,0.84)_0.8px,transparent_1.3px),radial-gradient(circle_at_88%_74%,rgba(255,255,255,0.72)_0.8px,transparent_1.3px)] [background-size:180px_180px]" />
      <div className="mesh-overlay absolute inset-0 opacity-12" />
      <div className="absolute inset-x-10 top-6 h-24 rounded-full bg-[rgba(255,125,89,0.16)] blur-3xl" />
      <div className="absolute bottom-4 right-4 h-32 w-32 rounded-full bg-[rgba(57,208,255,0.16)] blur-3xl" />

      <div
        ref={mountRef}
        className="relative z-10 min-h-[320px] w-full rounded-[26px] sm:min-h-[400px] sm:rounded-[30px] lg:min-h-[500px]"
      />

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.55 }}
        className="glass playful-sway absolute left-4 top-4 rounded-3xl px-4 py-3 text-left"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-coral)]">
          Lecture Notes
        </p>
        <p className="mt-1 text-sm font-medium">Upload once. Revise with summaries, questions, and flashcards.</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.28, duration: 0.55 }}
        className="glass playful-bob absolute bottom-4 left-4 rounded-3xl px-4 py-3"
      >
        <p className="text-xs text-[var(--accent-sky)]">Text, images, PDFs</p>
        <p className="mt-1 text-sm font-medium">Ask questions on your own material and step into active recall.</p>
      </motion.div>

      <div className="glass pulse-glow playful-pop absolute right-4 top-4 rounded-full px-4 py-2 text-xs font-medium">
        Summary • Quiz • Flashcards
      </div>
    </div>
  );
}
