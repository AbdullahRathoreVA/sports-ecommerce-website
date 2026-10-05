"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, useGLTF } from "@react-three/drei";
import * as THREE from "three";

/**
 * The 3D jersey.
 *
 * The mesh is a generated garment with unusable UVs, so artwork is PROJECTED:
 * the shader maps object-space x/y onto the front half of the design canvas
 * for front-facing surfaces and onto the back half (mirrored) for back-facing
 * ones, blending across the sides. Any design, any time, no UV unwrapping.
 *
 * `sweep` animates a heat-press style transfer from design A to design B, top
 * to bottom, with a warm line at the transfer edge — the factory's own
 * process, as a hero animation.
 */

export type JerseySceneProps = {
  textureA: HTMLCanvasElement;
  textureB?: HTMLCanvasElement | null;
  /** 0..1.1 — how far design B has been "pressed" onto the shirt. */
  sweepRef?: React.MutableRefObject<number>;
  /** Target Y rotation in radians, driven by drag / front-back buttons. */
  rotationRef: React.MutableRefObject<number>;
  autoRotate?: boolean;
  active: boolean;
  revision: number;
  className?: string;
  /** Render on demand with a preserved buffer (poster capture, screenshots). */
  still?: boolean;
};

const MODEL_URL = "/models/jersey.glb";

function useProjectedMaterial(textureA: HTMLCanvasElement, textureB: HTMLCanvasElement | null | undefined) {
  const texA = useMemo(() => {
    const t = new THREE.CanvasTexture(textureA);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, [textureA]);
  const texB = useMemo(() => {
    const t = new THREE.CanvasTexture(textureB ?? textureA);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, [textureA, textureB]);

  const uniforms = useMemo(
    () => ({
      uTexA: { value: texA },
      uTexB: { value: texB },
      uSweep: { value: 0 },
      uMin: { value: new THREE.Vector3(-0.5, -0.5, -0.2) },
      uMax: { value: new THREE.Vector3(0.5, 0.5, 0.2) },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  uniforms.uTexA.value = texA;
  uniforms.uTexB.value = texB;

  const material = useMemo(() => {
    const m = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.78,
      metalness: 0,
      sheen: 1,
      sheenRoughness: 0.75,
      sheenColor: new THREE.Color(0.32, 0.32, 0.34),
      side: THREE.DoubleSide,
    });
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vObjPos;\nvarying vec3 vObjNormal;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvObjPos = position;\nvObjNormal = normal;");
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
          varying vec3 vObjPos;
          varying vec3 vObjNormal;
          uniform sampler2D uTexA;
          uniform sampler2D uTexB;
          uniform float uSweep;
          uniform vec3 uMin;
          uniform vec3 uMax;
          float sweepGlow = 0.0;`,
        )
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
          vec3 span = max(uMax - uMin, vec3(1e-4));
          float u = clamp((vObjPos.x - uMin.x) / span.x, 0.0, 1.0);
          float v = clamp((vObjPos.y - uMin.y) / span.y, 0.0, 1.0);
          vec2 uvF = vec2(0.5 * u, v);
          vec2 uvB = vec2(0.5 + 0.5 * (1.0 - u), v);
          float fb = smoothstep(-0.18, 0.18, vObjNormal.z);
          vec4 a = mix(texture2D(uTexA, uvB), texture2D(uTexA, uvF), fb);
          vec4 b = mix(texture2D(uTexB, uvB), texture2D(uTexB, uvF), fb);
          float top = 1.0 - v;
          float pressed = 1.0 - smoothstep(uSweep - 0.012, uSweep + 0.012, top);
          diffuseColor.rgb *= mix(a.rgb, b.rgb, pressed);
          sweepGlow = exp(-pow((top - uSweep) * 38.0, 2.0)) * step(0.001, uSweep) * step(uSweep, 1.0);`,
        )
        .replace(
          "#include <emissivemap_fragment>",
          "#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(1.0, 0.55, 0.22) * sweepGlow * 0.9;",
        );
    };
    return m;
  }, [uniforms]);

  return { material, uniforms, texA, texB };
}

function Jersey({ textureA, textureB, sweepRef, rotationRef, autoRotate, revision }: Omit<JerseySceneProps, "active" | "className">) {
  // Meshopt only (decoder is bundled); never fetch a Draco decoder from a CDN.
  const { scene } = useGLTF(MODEL_URL, false, true);
  const group = useRef<THREE.Group>(null);
  const { material, uniforms, texA, texB } = useProjectedMaterial(textureA, textureB);

  // Re-upload canvas textures when the design changes.
  useEffect(() => {
    texA.needsUpdate = true;
    texB.needsUpdate = true;
  }, [revision, texA, texB]);

  const mesh = useMemo(() => {
    // The generated GLB carries node transforms (a Z-up → Y-up rotation and a
    // recentre offset). Bake them into the geometry so the projection shader
    // works in true model space: x = across the chest, y = up, z = forward.
    scene.updateMatrixWorld(true);
    const baked = new THREE.Group();
    const box = new THREE.Box3();
    scene.traverse((obj) => {
      if (!(obj as THREE.Mesh).isMesh) return;
      const source = obj as THREE.Mesh;
      const geometry = source.geometry.clone();
      geometry.applyMatrix4(source.matrixWorld);
      geometry.computeBoundingBox();
      box.union(geometry.boundingBox!);
      const m = new THREE.Mesh(geometry, material);
      m.castShadow = true;
      baked.add(m);
    });
    // Recentre so the garment rotates about its own middle.
    const centre = box.getCenter(new THREE.Vector3());
    baked.children.forEach((child) => (child as THREE.Mesh).geometry.translate(-centre.x, -centre.y, -centre.z));
    box.translate(centre.negate());
    uniforms.uMin.value.copy(box.min);
    uniforms.uMax.value.copy(box.max);
    return baked;
  }, [scene, material, uniforms]);

  const current = useRef(0);
  useFrame((state, delta) => {
    if (!group.current) return;
    if (autoRotate) rotationRef.current += delta * 0.35;
    // Critically damped follow so drags feel weighted, not twitchy.
    current.current = THREE.MathUtils.damp(current.current, rotationRef.current, 6, delta);
    group.current.rotation.y = current.current;
    group.current.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.012;
    if (sweepRef) uniforms.uSweep.value = sweepRef.current;
  });

  return (
    <group ref={group} dispose={null}>
      <primitive object={mesh} scale={1.18} />
    </group>
  );
}

function FrameGate({ active }: { active: boolean }) {
  const { invalidate } = useThree();
  useEffect(() => {
    if (active) invalidate();
  }, [active, invalidate]);
  return null;
}

export default function JerseyScene(props: JerseySceneProps) {
  return (
    <Canvas
      className={props.className}
      frameloop={props.active || props.still ? "always" : "never"}
      dpr={[1, 1.75]}
      camera={{ position: [0, 0.02, 2.95], fov: 32 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance", preserveDrawingBuffer: !!props.still }}
      shadows={false}
    >
      <FrameGate active={props.active} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[2.2, 2.6, 3]} intensity={1.6} />
      <directionalLight position={[-3, 1.2, -2]} intensity={0.7} color="#d9f7a0" />
      <Environment resolution={128}>
        <Lightformer form="rect" intensity={2.2} position={[0, 2.5, 3]} scale={[4, 2, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[-3, 0.5, 1]} rotation-y={Math.PI / 2} scale={[3, 2, 1]} color="#dbe3ff" />
        <Lightformer form="rect" intensity={1} position={[3, 0.5, -1]} rotation-y={-Math.PI / 2} scale={[3, 2, 1]} />
      </Environment>
      <Jersey
        textureA={props.textureA}
        textureB={props.textureB}
        sweepRef={props.sweepRef}
        rotationRef={props.rotationRef}
        autoRotate={props.autoRotate}
        revision={props.revision}
      />
      <ContactShadows position={[0, -0.72, 0]} opacity={0.38} scale={3.2} blur={2.6} far={1.6} resolution={256} frames={1} />
    </Canvas>
  );
}

useGLTF.preload(MODEL_URL, false, true);
