"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";

/**
 * Photoreal match ball in one small shader (fast to compile on every GPU):
 * exact 32-panel truncated icosahedron, stitched seams with a soft groove,
 * pebbled PU grain, glossy coat highlight, rim light and an Alrobel mark.
 */

const PHI = (1 + Math.sqrt(5)) / 2;
const H_PENT = 2.3274;
const H_HEX = 2.2673;

function centres() {
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
  ctx.translate(128, 104);
  ctx.scale(1.15, 1.15);
  ctx.translate(-60, -48);
  ctx.fillStyle = "#111214";
  ctx.fill(new Path2D("M6 92 L52 4 L98 92 H74 L52 48 L30 92 Z"));
  ctx.fillStyle = "#e11d26";
  ctx.fill(new Path2D("M22 78 C46 64 74 44 118 18 C96 40 70 60 40 80 Z"));
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#111214";
  ctx.font = "800 italic 36px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("ALROBEL", 128, 214);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

const vertex = /* glsl */ `
varying vec3 vDir;
varying vec3 vN;
varying vec3 vView;
void main() {
  vDir = normalize(position);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;

const fragment = /* glsl */ `
uniform vec3 uCentres[32];
uniform float uInvH[32];
uniform vec3 uPanel;
uniform vec3 uBase;
uniform vec3 uSeam;
uniform vec3 uRim;
uniform sampler2D uLogo;
uniform int uLogoIdx;
uniform vec3 uLogoU;
uniform vec3 uLogoV;
varying vec3 vDir;
varying vec3 vN;
varying vec3 vView;

float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}

void main() {
  vec3 p = normalize(vDir);
  float s1 = -1.0, s2 = -1.0; int best = 0;
  for (int k = 0; k < 32; k++) {
    float s = dot(p, uCentres[k]) * uInvH[k];
    if (s > s1) { s2 = s1; s1 = s; best = k; } else if (s > s2) { s2 = s; }
  }
  vec3 albedo = best < 12 ? uPanel : uBase;
  if (best == uLogoIdx) {
    vec2 luv = vec2(dot(p, uLogoU), dot(p, uLogoV)) * 2.15 + 0.5;
    if (luv.x > 0.0 && luv.x < 1.0 && luv.y > 0.0 && luv.y < 1.0) {
      vec4 l = texture2D(uLogo, luv);
      albedo = mix(albedo, l.rgb, l.a);
    }
  }
  float d = s1 - s2;
  float fw = fwidth(d);
  float seam = 1.0 - smoothstep(0.0024 - fw, 0.0024 + fw, d);
  float groove = 1.0 - smoothstep(0.0, 0.016, d);           // panels dip softly into the stitch line
  float grain = noise(p * 260.0) * 0.6 + noise(p * 90.0) * 0.4;  // pebbled PU surface

  vec3 n = normalize(vN);
  vec3 v = normalize(vView);
  vec3 L1 = normalize(vec3(0.55, 0.8, 0.65));
  vec3 L2 = normalize(vec3(-0.7, 0.15, 0.45));
  float diff = max(dot(n, L1), 0.0) * 0.82 + max(dot(n, L2), 0.0) * 0.16 + 0.16 + n.y * 0.05;
  diff *= mix(0.55, 1.0, smoothstep(-0.35, 0.45, dot(n, L1)));  // deeper core shadow on the far side
  float ao = mix(0.62, 1.0, 1.0 - groove);
  vec3 col = mix(albedo, uSeam, seam) * diff * ao * (0.96 + grain * 0.06);

  vec3 h = normalize(L1 + v);
  float coat = pow(max(dot(n, h), 0.0), 140.0) * 0.85 + pow(max(dot(n, h), 0.0), 18.0) * 0.08;
  col += coat * (1.0 - seam) * (0.75 + grain * 0.35);
  float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
  col += uRim * fres * 0.55 + vec3(fres * 0.12);

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/** `logo`: a customer's crest (canvas) printed on the front hexagon instead of the Alrobel mark. */
export function ProBall({
  radius = 1,
  panel = "#d9161f",
  base = "#e9e8e4",
  seam = "#26272b",
  rim = "#ff3b44",
  logo = null,
}: {
  radius?: number;
  panel?: string;
  base?: string;
  seam?: string;
  rim?: string;
  logo?: HTMLCanvasElement | null;
}) {
  // One material for the ball's lifetime; colours and crest are uniforms, so changing them never recompiles.
  const material = useMemo(() => {
    const c = centres();
    const target = new THREE.Vector3(0.3, 0.2, 1).normalize();
    let logoIdx = 12;
    c.forEach((v, k) => {
      if (k >= 12 && v.dot(target) > c[logoIdx]!.dot(target)) logoIdx = k;
    });
    const n = c[logoIdx]!;
    const u = new THREE.Vector3(0, 1, 0).cross(n).normalize();
    const v = n.clone().cross(u).normalize();
    return new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms: {
        uCentres: { value: c },
        uInvH: { value: c.map((_, k) => 1 / (k < 12 ? H_PENT : H_HEX)) },
        uPanel: { value: new THREE.Color() },
        uBase: { value: new THREE.Color() },
        uSeam: { value: new THREE.Color() },
        uRim: { value: new THREE.Color() },
        uLogo: { value: null },
        uLogoIdx: { value: logoIdx },
        uLogoU: { value: u },
        uLogoV: { value: v },
      },
    });
  }, []);

  useEffect(() => {
    (material.uniforms.uPanel!.value as THREE.Color).set(panel);
    (material.uniforms.uBase!.value as THREE.Color).set(base);
    (material.uniforms.uSeam!.value as THREE.Color).set(seam);
    (material.uniforms.uRim!.value as THREE.Color).set(rim);
  }, [material, panel, base, seam, rim]);

  useEffect(() => {
    let t: THREE.Texture;
    if (logo) {
      t = new THREE.CanvasTexture(logo);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
    } else {
      t = logoTexture();
    }
    material.uniforms.uLogo!.value = t;
    return () => t.dispose();
  }, [material, logo]);

  useEffect(() => () => material.dispose(), [material]);

  return (
    <mesh material={material}>
      <sphereGeometry args={[radius, 96, 64]} />
    </mesh>
  );
}
