"use client";

import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";

/**
 * Photo inflation: turns a product photo (front + back views, already cut out)
 * into a real 3D object. A height map built offline from the silhouette
 * (.gstack/prep-inflate.py) is lifted into a rounded "pillow" surface with the
 * photo on the front and the other view on the back. The surface carries the
 * real product photo — real latex, real print, real logo — so it reads as a
 * photograph, while the 3D shape catches light, shadow and parallax.
 *
 * Geometry: x across, y up (height 1 unit), z towards the viewer.
 * Material groups: 0 = front photo, 1 = back photo.
 */

export function loadHeight(url: string): Promise<{ w: number; h: number; data: Uint8ClampedArray }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0);
      resolve({ w: img.width, h: img.height, data: ctx.getImageData(0, 0, img.width, img.height).data });
    };
    img.onerror = reject;
    img.src = url;
  });
}

export function buildInflatedGeometry(map: { w: number; h: number; data: Uint8ClampedArray }, aspect: number, depth: number) {
  const { w: W, h: H, data } = map;
  const height = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) height[i] = data[i * 4]! / 255;
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && height[y * W + x]! > 0;

  const positions: number[] = [];
  const uvs: number[] = [];
  const front = new Int32Array(W * H).fill(-1);
  const back = new Int32Array(W * H).fill(-1);
  const push = (x: number, y: number, z: number) => {
    positions.push((x / (W - 1) - 0.5) * aspect, 0.5 - y / (H - 1), z);
    uvs.push(x / (W - 1), 1 - y / (H - 1));
    return positions.length / 3 - 1;
  };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!inside(x, y)) continue;
      // Outline vertices sit at z = 0 so front and back meet with no crack.
      const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      const z = edge ? 0 : height[y * W + x]! * depth;
      front[y * W + x] = push(x, y, z);
      back[y * W + x] = push(x, y, -z);
    }
  }
  const frontIdx: number[] = [];
  const backIdx: number[] = [];
  for (let y = 0; y < H - 1; y++) {
    for (let x = 0; x < W - 1; x++) {
      const a = y * W + x, b = a + 1, c = a + W, d = c + 1;
      if (front[a]! < 0 || front[b]! < 0 || front[c]! < 0 || front[d]! < 0) continue;
      frontIdx.push(front[a]!, front[c]!, front[b]!, front[b]!, front[c]!, front[d]!);
      backIdx.push(back[a]!, back[b]!, back[c]!, back[b]!, back[d]!, back[c]!);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex([...frontIdx, ...backIdx]);
  g.addGroup(0, frontIdx.length, 0);
  g.addGroup(frontIdx.length, backIdx.length, 1);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

const textureLoader = typeof window !== "undefined" ? new THREE.TextureLoader() : null;

export function loadTexture(url: string) {
  return new Promise<THREE.Texture>((resolve, reject) =>
    textureLoader!.load(
      url,
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 8;
        resolve(t);
      },
      undefined,
      reject,
    ),
  );
}

export type InflatedAsset = { geometry: THREE.BufferGeometry; materials: THREE.Material[] };

/** Loads one inflated product: `${base}-height.png`, `${base}-front.webp`, `${base}-back.webp`. */
export function useInflated(base: string, aspect: number, depth: number): InflatedAsset | null {
  const [asset, setAsset] = useState<InflatedAsset | null>(null);
  useEffect(() => {
    let alive = true;
    Promise.all([loadHeight(`${base}-height.png`), loadTexture(`${base}-front.webp`), loadTexture(`${base}-back.webp`)]).then(([hm, front, backTex]) => {
      if (!alive) return;
      // Lambert keeps the shader tiny (fast to compile everywhere); the photo already carries studio light.
      const mk = (map: THREE.Texture) => new THREE.MeshLambertMaterial({ map, emissive: new THREE.Color("#ffffff"), emissiveMap: map, emissiveIntensity: 0.32, alphaTest: 0.5, alphaToCoverage: true });
      setAsset({ geometry: buildInflatedGeometry(hm, aspect, depth), materials: [mk(front), mk(backTex)] });
    });
    return () => {
      alive = false;
    };
  }, [base, aspect, depth]);
  useEffect(
    () => () => {
      asset?.geometry.dispose();
      asset?.materials.forEach((m) => {
        (m as THREE.MeshLambertMaterial).map?.dispose();
        m.dispose();
      });
    },
    [asset],
  );
  return asset;
}

export function InflatedMesh({ asset, ...props }: { asset: InflatedAsset } & Omit<React.ComponentProps<"mesh">, "geometry" | "material">) {
  const mats = useMemo(() => asset.materials, [asset]);
  return <mesh geometry={asset.geometry} material={mats} castShadow={false} receiveShadow={false} {...props} />;
}
