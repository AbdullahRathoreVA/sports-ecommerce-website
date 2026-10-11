"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { buildInflatedGeometry, loadHeight, loadTexture } from "./inflated";
import { ProBall } from "./pro-ball";
import { deviceQuality } from "@/lib/device";

/**
 * Design Studio stage for goalkeeper gloves and footballs.
 *
 * Gloves are the owner's real glove photos inflated into 3D; a small shader
 * recolours only the coloured trim (saturated pixels) to the customer's pick,
 * keeping the photo's shading, black backhand and white latex palm — so a
 * custom colour still looks photographed, not drawn. The ball is the
 * procedural 32-panel ball with the customer's colours and crest.
 */

export type GearKind = "gloves" | "ball";
export type GearDesign = { accent: string; panel: string; base: string; seam: string; crest: HTMLCanvasElement | null };

const DIR = "/media/catalog/3d/";
// Width/height of each glove cut-out (from public/media/catalog/3d/meta.json).
const ASPECT: Record<string, number> = { "gk-a-palm": 0.6369, "gk-a-back": 0.6073 };

const vertex = /* glsl */ `
varying vec2 vUv;
varying vec3 vN;
void main() {
  vUv = uv;
  vN = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const fragment = /* glsl */ `
uniform sampler2D uMap;
uniform vec3 uTarget;
varying vec2 vUv;
varying vec3 vN;
void main() {
  vec4 tex = texture2D(uMap, vUv);
  // Texture alpha = the product outline (smooth); the mesh extends slightly past it.
  float edge = smoothstep(0.35, 0.65, tex.a);
  if (edge < 0.01) discard;
  vec3 c = tex.rgb;
  float mx = max(c.r, max(c.g, c.b));
  float mn = min(c.r, min(c.g, c.b));
  float sat = mx > 0.0 ? (mx - mn) / mx : 0.0;
  // Only the coloured trim changes; black shell and white latex keep their photo look.
  float m = smoothstep(0.28, 0.5, sat) * smoothstep(0.03, 0.12, mx);
  float tmax = max(uTarget.r, max(uTarget.g, uTarget.b));
  vec3 rec = tmax < 0.04 ? vec3(mx * 0.12) : uTarget * (mx / tmax);
  c = mix(c, clamp(rec, 0.0, 1.0), m);
  vec3 n = normalize(vN);
  float light = 0.62 + 0.38 * max(dot(n, normalize(vec3(0.4, 0.7, 0.9))), 0.0) + 0.12 * max(dot(n, normalize(vec3(-0.8, 0.2, 0.4))), 0.0);
  gl_FragColor = vec4(c * light * 1.12, edge);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

type Glove = { geometry: THREE.BufferGeometry; front: THREE.ShaderMaterial; back: THREE.ShaderMaterial };

function useGlove(name: string, target: THREE.Color) {
  const [glove, setGlove] = useState<Glove | null>(null);
  useEffect(() => {
    let alive = true;
    Promise.all([loadHeight(`${DIR}${name}-height-hd.png`), loadTexture(`${DIR}${name}-front.webp`), loadTexture(`${DIR}${name}-back.webp`)]).then(([hm, f, b]) => {
      if (!alive) return;
      const mk = (map: THREE.Texture) => new THREE.ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, uniforms: { uMap: { value: map }, uTarget: { value: target } }, alphaToCoverage: true });
      setGlove({ geometry: buildInflatedGeometry(hm, ASPECT[name] ?? 0.62, 0.07), front: mk(f), back: mk(b) });
    });
    return () => {
      alive = false;
    };
  }, [name, target]);
  return glove;
}

function Gloves({ accent }: { accent: string }) {
  // One shared colour object: changing the colour updates both gloves without touching the shaders.
  const target = useMemo(() => new THREE.Color(), []);
  useEffect(() => {
    target.set(accent);
  }, [target, accent]);
  const palm = useGlove("gk-a-palm", target);
  const back = useGlove("gk-a-back", target);
  if (!palm || !back) return null;
  return (
    <group scale={1.55} position={[0, -0.05, 0]}>
      <mesh geometry={palm.geometry} material={[palm.front, palm.back]} position={[-0.3, 0, -0.06]} rotation={[0, 0.32, 0.08]} />
      <mesh geometry={back.geometry} material={[back.front, back.back]} position={[0.28, 0.03, 0.06]} rotation={[0, -0.18, -0.06]} />
    </group>
  );
}

function Rig({ rotationRef, children }: { rotationRef: React.MutableRefObject<number>; children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null);
  const cur = useRef(0);
  useFrame((state, delta) => {
    if (!g.current) return;
    cur.current = THREE.MathUtils.damp(cur.current, rotationRef.current, 6, Math.min(delta, 0.1));
    g.current.rotation.y = cur.current;
    g.current.position.y = Math.sin(state.clock.elapsedTime * 0.9) * 0.02;
  });
  return <group ref={g}>{children}</group>;
}

/** Compile in the background once the model is ready, then start drawing. */
function Ready({ when, onReady }: { when: boolean; onReady: () => void }) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    if (!when) return;
    let alive = true;
    gl.compileAsync(scene, camera)
      .catch(() => undefined)
      .then(() => alive && onReady());
    return () => {
      alive = false;
    };
  }, [when, gl, scene, camera, onReady]);
  return null;
}

export default function GearStudioScene({
  kind,
  design,
  rotationRef,
  onCanvas,
  className,
}: {
  kind: GearKind;
  design: GearDesign;
  rotationRef: React.MutableRefObject<number>;
  onCanvas?: (c: HTMLCanvasElement) => void;
  className?: string;
}) {
  const [ready, setReady] = useState(false);
  const dpr = useMemo(() => (deviceQuality() === "high" ? 1.6 : 1.2), []);
  const onReady = useMemo(() => () => setReady(true), []);
  return (
    <Canvas
      className={className}
      frameloop={ready ? "always" : "never"}
      dpr={dpr}
      camera={{ position: [0, 0, 3.4], fov: 34 }}
      gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
      onCreated={({ gl }) => {
        gl.debug.checkShaderErrors = process.env.NODE_ENV !== "production";
        onCanvas?.(gl.domElement);
      }}
    >
      <ambientLight intensity={1.0} />
      <directionalLight position={[2.5, 3, 4]} intensity={1.2} />
      <Rig rotationRef={rotationRef}>
        {kind === "gloves" ? <Gloves accent={design.accent} /> : <ProBall radius={0.62} panel={design.panel} base={design.base} seam={design.seam} logo={design.crest} />}
      </Rig>
      <Ready when onReady={onReady} />
    </Canvas>
  );
}
