"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, useGLTF } from "@react-three/drei";
import { bakeJersey, createProjectedMaterial } from "@/components/three/projected-material";
import { Football, GlovePair } from "@/components/three/gear";
import { PRESETS, renderJersey, syncCanvasFont, type JerseyDesign } from "@/lib/jersey/design";

/**
 * Dev-only product render studio: one item, transparent background, used by
 * .gstack/render-products.mjs to make catalogue images until real photos arrive.
 *   ?item=kit&preset=cobalt&rot=0.35      ?item=kit&base=..&accent=..&pattern=..&number=..
 *   ?item=ball&panel=%23e11d26             ?item=gloves&accent=%231d4ed8
 */

function Kit({ design, rot }: { design: JerseyDesign; rot: number }) {
  const { scene } = useGLTF("/models/jersey.glb", false, true);
  const baked = useMemo(() => bakeJersey(scene), [scene]);
  const material = useMemo(() => createProjectedMaterial(renderJersey(design), baked.min, baked.max).material, [design, baked]);
  return (
    <group rotation={[0, rot, 0]} scale={1.18}>
      {baked.geometries.map((g, i) => (
        <mesh key={i} geometry={g} material={material} />
      ))}
    </group>
  );
}

export function RenderStudio({ params }: { params: Record<string, string> }) {
  const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => {
    document.fonts.ready.then(() => {
      syncCanvasFont();
      setFontsReady(true);
    });
  }, []);
  const item = params.item ?? "kit";
  const rot = Number(params.rot ?? (item === "kit" ? 0.35 : 0));
  const design = useMemo(() => {
    const preset = PRESETS.find((p) => p.id === params.preset)?.design ?? PRESETS[0]!.design;
    const pick = (k: keyof JerseyDesign) => (params[k] as string | undefined) ?? (preset as Record<string, unknown>)[k];
    return {
      ...preset,
      base: pick("base"),
      accent: pick("accent"),
      trim: pick("trim"),
      pattern: pick("pattern"),
      sponsor: pick("sponsor"),
      name: pick("name"),
      number: pick("number"),
      textColor: pick("textColor"),
      houseMark: true,
    } as JerseyDesign;
  }, [params]);

  if (!fontsReady) return null;
  return (
    <Canvas
      id="studio"
      style={{ width: 900, height: 900 }}
      dpr={1.5}
      camera={{ position: [0, 0.05, item === "kit" ? 2.55 : 3.4], fov: 32 }}
      gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
    >
      <ambientLight intensity={0.45} />
      <directionalLight position={[2.4, 3, 3.2]} intensity={1.7} />
      <directionalLight position={[-3, 1.4, -2]} intensity={0.8} />
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={2.4} position={[0, 3, 3]} scale={[5, 2, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[-3.5, 0.6, 1]} rotation-y={Math.PI / 2} scale={[3, 2, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[3.5, 0.6, -1]} rotation-y={-Math.PI / 2} scale={[3, 2, 1]} />
      </Environment>
      <Suspense fallback={null}>
        {item === "kit" && <Kit design={design} rot={rot} />}
        {item === "ball" && (
          <group rotation={[0.18, rot - 0.25, 0.05]}>
            <Football radius={0.66} colors={{ panel: params.panel, base: params.base, seam: params.seam }} />
          </group>
        )}
        {item === "gloves" && (
          <group rotation={[0, rot, 0]} position={[0, 0.06, 0]} scale={1.12}>
            <GlovePair accent={params.accent} />
          </group>
        )}
      </Suspense>
      <ContactShadows position={[0, item === "ball" ? -0.7 : item === "kit" ? -0.78 : -0.92, 0]} opacity={0.42} scale={4} blur={2.4} far={1.6} resolution={512} />
    </Canvas>
  );
}

