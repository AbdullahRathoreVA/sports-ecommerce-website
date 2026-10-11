"use client";

import { useEffect, useMemo } from "react";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";

/**
 * Procedural sports gear for the 3D scenes — no model files to download.
 *
 * Football: a true 32-panel ball (12 pentagons, 20 hexagons). Each pixel picks
 * the truncated-icosahedron face its direction projects onto, so panels and
 * seams are exact at any zoom. Brand pentagons, white hexagons, an Alrobel
 * mark printed on one hexagon.
 *
 * Goalkeeper glove: chunky latex palm, black backhand, red wrist strap, built
 * from rounded primitives (keeper gloves are puffy, which suits them).
 */

// ---------- Football ----------------------------------------------------------

const PHI = (1 + Math.sqrt(5)) / 2;
// Distances from the centre to pentagon and hexagon faces of a unit-edge truncated icosahedron.
const H_PENT = 2.3274;
const H_HEX = 2.2673;

function ballCentres() {
  const pent: THREE.Vector3[] = [];
  for (const a of [-1, 1]) for (const b of [-PHI, PHI]) pent.push(new THREE.Vector3(0, a, b), new THREE.Vector3(a, b, 0), new THREE.Vector3(b, 0, a));
  const hex: THREE.Vector3[] = [];
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) hex.push(new THREE.Vector3(x, y, z));
  const i = 1 / PHI;
  for (const a of [-i, i]) for (const b of [-PHI, PHI]) hex.push(new THREE.Vector3(0, a, b), new THREE.Vector3(a, b, 0), new THREE.Vector3(b, 0, a));
  return [...pent, ...hex].map((v) => v.normalize());
}

function logoTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.translate(128, 112);
  ctx.scale(1.25, 1.25);
  ctx.translate(-60, -48);
  ctx.fillStyle = "#111214";
  ctx.fill(new Path2D("M6 92 L52 4 L98 92 H74 L52 48 L30 92 Z"));
  ctx.fillStyle = "#e11d26";
  ctx.fill(new Path2D("M22 78 C46 64 74 44 118 18 C96 40 70 60 40 80 Z"));
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#111214";
  ctx.font = "800 italic 34px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("ALROBEL", 128, 222);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function useBallMaterial(colors: { panel?: string; base?: string; seam?: string } = {}) {
  const { panel = "#e11d26", base = "#f5f5f2", seam = "#2a2b2f" } = colors;
  const material = useMemo(() => {
    const centres = ballCentres();
    const invH = centres.map((_, k) => 1 / (k < 12 ? H_PENT : H_HEX));
    // Logo on the hexagon that faces the camera at rest (towards +z, slightly up).
    const target = new THREE.Vector3(0.35, 0.25, 1).normalize();
    let logoIdx = 12;
    centres.forEach((c, k) => {
      if (k >= 12 && c.dot(target) > centres[logoIdx]!.dot(target)) logoIdx = k;
    });
    const n = centres[logoIdx]!;
    const u = new THREE.Vector3(0, 1, 0).cross(n).normalize();
    const v = n.clone().cross(u).normalize();
    const uniforms = {
      uCentres: { value: centres },
      uInvH: { value: invH },
      uPanel: { value: new THREE.Color(panel) },
      uBase: { value: new THREE.Color(base) },
      uSeam: { value: new THREE.Color(seam) },
      uLogo: { value: null as THREE.Texture | null },
      uLogoIdx: { value: logoIdx },
      uLogoU: { value: u },
      uLogoV: { value: v },
    };
    const m = new THREE.MeshPhysicalMaterial({ roughness: 0.42, clearcoat: 0.55, clearcoatRoughness: 0.35 });
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vBallDir;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvBallDir = normalize(position);");
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
          varying vec3 vBallDir;
          uniform vec3 uCentres[32];
          uniform float uInvH[32];
          uniform vec3 uPanel; uniform vec3 uBase; uniform vec3 uSeam;
          uniform sampler2D uLogo; uniform int uLogoIdx; uniform vec3 uLogoU; uniform vec3 uLogoV;
          float ballSeam;`,
        )
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
          vec3 bp = normalize(vBallDir);
          float s1 = -1.0; float s2 = -1.0; int best = 0;
          for (int k = 0; k < 32; k++) {
            float s = dot(bp, uCentres[k]) * uInvH[k];
            if (s > s1) { s2 = s1; s1 = s; best = k; } else if (s > s2) { s2 = s; }
          }
          vec3 col = best < 12 ? uPanel : uBase;
          if (best == uLogoIdx) {
            vec2 luv = vec2(dot(bp, uLogoU), dot(bp, uLogoV)) * 2.1 + 0.5;
            if (luv.x > 0.0 && luv.x < 1.0 && luv.y > 0.0 && luv.y < 1.0) {
              vec4 l = texture2D(uLogo, vec2(luv.x, luv.y));
              col = mix(col, l.rgb, l.a);
            }
          }
          float d = s1 - s2;
          float fw = fwidth(d);
          ballSeam = 1.0 - smoothstep(0.0028 - fw, 0.0028 + fw, d);
          diffuseColor.rgb = mix(col, uSeam, ballSeam);`,
        )
        .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.95, ballSeam);");
    };
    return { m, uniforms };
  }, [panel, base, seam]);

  useEffect(() => {
    const t = logoTexture();
    material.uniforms.uLogo.value = t;
    return () => t.dispose();
  }, [material]);

  return material.m;
}

export function Football({ radius = 1, colors }: { radius?: number; colors?: { panel?: string; base?: string; seam?: string } }) {
  const material = useBallMaterial(colors);
  return (
    <mesh material={material} castShadow>
      <sphereGeometry args={[radius, 128, 96]} />
    </mesh>
  );
}

// ---------- Goalkeeper glove ---------------------------------------------------

function useGloveMaterials(accent: string) {
  return useMemo(
    () => ({
      latex: new THREE.MeshPhysicalMaterial({ color: "#f2f2ef", roughness: 0.68, sheen: 0.4, sheenColor: new THREE.Color("#ffffff") }),
      shell: new THREE.MeshStandardMaterial({ color: "#16171a", roughness: 0.72 }),
      accent: new THREE.MeshPhysicalMaterial({ color: accent, roughness: 0.42, clearcoat: 0.5 }),
      white: new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.5 }),
    }),
    [accent],
  );
}

// Index → pinky. The base glove is a right glove: palm faces +z, fingers +y, thumb towards +x.
// Lengths are the straight part; each capsule is built at its real length so the tips stay round.
const FINGERS = [
  { x: 0.2, len: 0.3, tilt: -0.08 },
  { x: 0.067, len: 0.35, tilt: -0.02 },
  { x: -0.067, len: 0.33, tilt: 0.03 },
  { x: -0.2, len: 0.25, tilt: 0.1 },
];
const R_FINGER = 0.074;

function logoPlaneTexture() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 160;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.translate(20, 22);
  ctx.scale(1.2, 1.2);
  ctx.fill(new Path2D("M6 92 L52 4 L98 92 H74 L52 48 L30 92 Z"));
  ctx.fillStyle = "#e11d26";
  ctx.fill(new Path2D("M22 78 C46 64 74 44 118 18 C96 40 70 60 40 80 Z"));
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 italic 72px system-ui, sans-serif";
  ctx.fillText("ALROBEL", 172, 112);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/**
 * One goalkeeper glove. `mirrored` is set on left gloves (the parent scales x
 * by -1), so the printed logos are flipped back to read correctly.
 */
export function GoalkeeperGlove({ accent = "#e11d26", mirrored = false }: { accent?: string; mirrored?: boolean }) {
  const m = useGloveMaterials(accent);
  const logo = useMemo(() => logoPlaneTexture(), []);
  useEffect(() => () => logo.dispose(), [logo]);
  const fingers = useMemo(
    () => FINGERS.map((f) => ({ ...f, front: new THREE.CapsuleGeometry(R_FINGER, f.len, 10, 24), back: new THREE.CapsuleGeometry(R_FINGER * 0.9, f.len * 0.94, 8, 18) })),
    [],
  );
  const thumb = useMemo(() => ({ front: new THREE.CapsuleGeometry(0.078, 0.2, 10, 24), back: new THREE.CapsuleGeometry(0.07, 0.19, 8, 18) }), []);
  const flip = mirrored ? -1 : 1;

  return (
    <group>
      {/* Cuff and wrist strap with the logo */}
      <mesh material={m.shell} position={[0, -0.52, -0.01]} scale={[1, 1, 0.74]}>
        <cylinderGeometry args={[0.245, 0.262, 0.3, 48]} />
      </mesh>
      <mesh material={m.accent} position={[0, -0.43, -0.005]} scale={[1, 1, 0.78]}>
        <cylinderGeometry args={[0.262, 0.262, 0.15, 48]} />
      </mesh>
      <mesh position={[0, -0.43, 0.208]} scale={[flip, 1, 1]}>
        <planeGeometry args={[0.36, 0.112]} />
        <meshBasicMaterial map={logo} transparent toneMapped={false} />
      </mesh>

      {/* Hand: black backhand shell, thick white latex palm */}
      <RoundedBox args={[0.55, 0.5, 0.13]} radius={0.06} smoothness={5} position={[0, -0.1, -0.045]} material={m.shell} />
      <RoundedBox args={[0.57, 0.52, 0.11]} radius={0.05} smoothness={5} position={[0, -0.1, 0.05]} material={m.latex} />
      {/* Backhand: red knuckle band and a big logo */}
      <RoundedBox args={[0.5, 0.075, 0.03]} radius={0.014} smoothness={3} position={[0, 0.08, -0.108]} material={m.accent} />
      <mesh position={[0, -0.12, -0.112]} rotation={[0, Math.PI, 0]} scale={[flip, 1, 1]}>
        <planeGeometry args={[0.46, 0.144]} />
        <meshBasicMaterial map={logo} transparent toneMapped={false} />
      </mesh>

      {/* Fingers: latex front, black back with a red spine */}
      {fingers.map((f) => (
        <group key={f.x} position={[f.x, 0.11, 0]} rotation={[0, 0, f.tilt]}>
          <mesh geometry={f.front} material={m.latex} position={[0, f.len / 2 + R_FINGER * 0.6, 0.02]} />
          <mesh geometry={f.back} material={m.shell} position={[0, f.len / 2 + R_FINGER * 0.5, -0.028]} />
          <mesh material={m.accent} position={[0, f.len / 2 + 0.02, -0.093]}>
            <boxGeometry args={[0.038, f.len * 0.9, 0.012]} />
          </mesh>
        </group>
      ))}

      {/* Thumb, angled up and out towards +x */}
      <group position={[0.25, -0.2, 0.035]} rotation={[0.15, -0.35, -0.72]}>
        <mesh geometry={thumb.front} material={m.latex} position={[0, 0.17, 0.014]} />
        <mesh geometry={thumb.back} material={m.shell} position={[0, 0.16, -0.03]} />
      </group>
    </group>
  );
}

/** A pair like a product shot: one glove shows the latex palm, the other the branded backhand. */
export function GlovePair({ accent }: { accent?: string }) {
  return (
    <group>
      {/* Left glove (mirrored right), palm towards the viewer. */}
      <group position={[-0.33, 0, 0.04]} rotation={[0, 0.3, 0.08]} scale={[-1, 1, 1]}>
        <GoalkeeperGlove accent={accent} mirrored />
      </group>
      {/* Right glove turned round: backhand and logo towards the viewer. */}
      <group position={[0.33, 0.03, -0.04]} rotation={[0, Math.PI - 0.3, -0.08]}>
        <GoalkeeperGlove accent={accent} />
      </group>
    </group>
  );
}
