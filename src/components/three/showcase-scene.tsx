"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import { buildInflatedGeometry, loadHeight, loadTexture } from "./inflated";
import { ProBall } from "./pro-ball";
import { deviceQuality } from "@/lib/device";

/**
 * Opening showroom: a 3D Alrobel logo spins up out of the dark, a ring of red
 * light opens on the floor, and the whole range flies in to orbit it — the
 * owner's real products (jerseys, goalkeeper gloves, motorbike and racing
 * suits, leather, tracksuits) inflated from his photos into 3D, plus match
 * balls, all in Alrobel red / black / white. The ring orbits on its own; drag
 * to spin it; the product at the front lifts towards you and its name shows
 * below; click any product to open that range.
 *
 * Built to run on every device: one shared simple material for all products
 * (compiled once, in the background, before the first frame), fog for depth
 * instead of extra passes, real-time intro (no slow motion), adaptive
 * resolution.
 */

export type ShowcaseItem = { key: string; label: string; href: string };
export type ShowcaseSceneProps = {
  active: boolean;
  settled?: boolean;
  still?: boolean;
  /** Drag input from the stage: radians to add to the ring this frame. */
  dragRef: React.MutableRefObject<number>;
  hoverRef: React.MutableRefObject<boolean>;
  /** Poster capture of the stage without products (the 3D intro continues seamlessly from it). */
  bare?: boolean;
  onReady?: () => void;
  onFront?: (index: number) => void;
  onItemClick?: (href: string) => void;
  className?: string;
};

const DIR = "/media/catalog/3d-v4/";
// Width/height of each cut-out (public/media/catalog/3d-v4/meta.json, built by .gstack/prep-v4.py from the owner's 2026-10-13 photos).
const ASPECT: Record<string, number> = {
  "jersey-hoops": 0.9003, "leather-racer": 0.8355, "racing-red": 0.5376, "racing-silver": 0.5975, "hoodie-black": 0.8647,
  "af-jersey-red": 0.9354, "varsity-red": 1.2041, "bag-red": 1.3355, "moto-red": 0.6544,
  "gk-c-back": 0.5877, "gk-c-palm": 0.6022, "gk-d-back": 0.6145, "gk-d-palm": 0.6053,
};

type Def =
  | { kind: "single"; asset: string; height: number; depth: number }
  | { kind: "pair"; palm: string; back: string; height: number }
  | { kind: "ball"; panel: string; base: string };

const SOCCER = "/products/c/sublimation-teamwear";
const GLOVES = "/products/c/goalkeeper-gloves";
const BALLS = "/products/c/footballs";
const MOTO = "/products/c/motorbike-racing-suits";
const RACING = "/products/c/car-kart-racing-suits";
const LEATHER = "/products/c/leather-jackets";
const HOODIES = "/products/c/hoodies";
const BAGS = "/products/c/bags";
const VARSITY = "/products/c/varsity-outerwear";
const AMFOOT = "/products/c/american-football";

/** Ring order: the hero jersey starts at the front; categories alternate so every turn shows variety. */
export const SHOWCASE: (ShowcaseItem & { def: Def })[] = [
  { key: "jersey-hoops", label: "Soccer Uniforms", href: SOCCER, def: { kind: "single", asset: "jersey-hoops", height: 1.2, depth: 0.045 } },
  { key: "ball-red", label: "Match Footballs", href: BALLS, def: { kind: "ball", panel: "#d9161f", base: "#ebeae6" } },
  { key: "gk-c", label: "Goalkeeper Gloves", href: GLOVES, def: { kind: "pair", palm: "gk-c-palm", back: "gk-c-back", height: 1.05 } },
  { key: "moto-red", label: "Motorbike Suits", href: MOTO, def: { kind: "single", asset: "moto-red", height: 1.6, depth: 0.05 } },
  { key: "leather-racer", label: "Leather Jackets", href: LEATHER, def: { kind: "single", asset: "leather-racer", height: 1.25, depth: 0.05 } },
  { key: "racing-red", label: "Racing Suits", href: RACING, def: { kind: "single", asset: "racing-red", height: 1.6, depth: 0.05 } },
  { key: "hoodie-black", label: "Hoodies", href: HOODIES, def: { kind: "single", asset: "hoodie-black", height: 1.2, depth: 0.045 } },
  { key: "af-jersey-red", label: "American Football", href: AMFOOT, def: { kind: "single", asset: "af-jersey-red", height: 1.2, depth: 0.045 } },
  { key: "gk-d", label: "Goalkeeper Gloves", href: GLOVES, def: { kind: "pair", palm: "gk-d-palm", back: "gk-d-back", height: 1.05 } },
  { key: "ball-black", label: "Match Footballs", href: BALLS, def: { kind: "ball", panel: "#121316", base: "#ebeae6" } },
  { key: "varsity-red", label: "Varsity Jackets", href: VARSITY, def: { kind: "single", asset: "varsity-red", height: 1.0, depth: 0.05 } },
  { key: "bag-red", label: "Sports Bags", href: BAGS, def: { kind: "single", asset: "bag-red", height: 0.8, depth: 0.08 } },
  { key: "racing-silver", label: "Racing Suits", href: RACING, def: { kind: "single", asset: "racing-silver", height: 1.6, depth: 0.05 } },
];

const N = SHOWCASE.length;
// Orbit: a wide, shallow ellipse — spreads the range sideways and keeps the sides inside the hero frame.
const RX = 2.55;
const RZ = 1.65;
const R = RX;
const END = 2.6; // seconds until the intro has settled

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const seg = (t: number, start: number, dur: number) => clamp01((t - start) / dur);
const easeOutCubic = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
const easeInOutCubic = (x: number) => {
  const t = clamp01(x);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

type Mesh3D = { geometry: THREE.BufferGeometry; materials: THREE.Material[] };

/** Loads every inflated product in parallel; resolves once all are ready. */
function useInflatedSet(names: string[]) {
  const [set, setSet] = useState<Record<string, Mesh3D> | null>(null);
  useEffect(() => {
    let alive = true;
    // The texture alpha is the product outline: alphaTest cuts it pixel-smooth, alphaToCoverage anti-aliases it.
    const mk = (map: THREE.Texture) => new THREE.MeshLambertMaterial({ map, emissive: new THREE.Color("#ffffff"), emissiveMap: map, emissiveIntensity: 0.34, alphaTest: 0.5, alphaToCoverage: true });
    Promise.all(
      names.map(async (n) => {
        const [hm, front, back] = await Promise.all([loadHeight(`${DIR}${n}-height.png`), loadTexture(`${DIR}${n}-front.webp`), loadTexture(`${DIR}${n}-back.webp`)]);
        const mesh: Mesh3D = { geometry: buildInflatedGeometry(hm, ASPECT[n] ?? 0.7, 0.06, 2), materials: [mk(front), mk(back)] };
        return [n, mesh] as [string, Mesh3D];
      }),
    ).then((entries) => {
      if (alive) setSet(Object.fromEntries(entries));
    });
    return () => {
      alive = false;
    };
  }, [names]);
  return set;
}

function radial(inner: string, outer: string, size = 128) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** The Alrobel "A" and its red swoosh, extruded and bevelled. */
function Logo({ progress }: { progress: React.MutableRefObject<number> }) {
  const group = useRef<THREE.Group>(null);
  const { a, swoosh } = useMemo(() => {
    const flip = (x: number, y: number): [number, number] => [x - 60, 48 - y];
    const A = new THREE.Shape();
    const pts: [number, number][] = [[6, 92], [52, 4], [98, 92], [74, 92], [52, 48], [30, 92]];
    pts.forEach(([x, y], i) => (i ? A.lineTo(...flip(x, y)) : A.moveTo(...flip(x, y))));
    A.closePath();
    const S = new THREE.Shape();
    S.moveTo(...flip(22, 78));
    S.bezierCurveTo(...flip(46, 64), ...flip(74, 44), ...flip(118, 18));
    S.bezierCurveTo(...flip(96, 40), ...flip(70, 60), ...flip(40, 80));
    S.closePath();
    const opts = { depth: 12, bevelEnabled: true, bevelThickness: 2.4, bevelSize: 1.6, bevelSegments: 3, curveSegments: 28 };
    const ga = new THREE.ExtrudeGeometry(A, opts);
    const gs = new THREE.ExtrudeGeometry(S, { ...opts, depth: 6 });
    ga.translate(0, 0, -6);
    gs.translate(0, 0, 8);
    return { a: ga, swoosh: gs };
  }, []);
  // Matcaps: polished chrome "A" and glossy red swoosh with no lights or environment passes needed.
  const mats = useMemo(() => {
    const cap = (stops: [number, string][], spec: string) => {
      const c = document.createElement("canvas");
      c.width = c.height = 256;
      const ctx = c.getContext("2d")!;
      const g = ctx.createRadialGradient(100, 86, 6, 128, 128, 128);
      stops.forEach(([o, col]) => g.addColorStop(o, col));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 256, 256);
      const h = ctx.createRadialGradient(92, 78, 0, 92, 78, 46);
      h.addColorStop(0, spec);
      h.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = h;
      ctx.fillRect(0, 0, 256, 256);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    };
    return {
      a: new THREE.MeshMatcapMaterial({ matcap: cap([[0, "#ffffff"], [0.45, "#d9dadd"], [0.75, "#8a8d93"], [1, "#2b2d31"]], "rgba(255,255,255,0.9)") }),
      s: new THREE.MeshMatcapMaterial({ matcap: cap([[0, "#ff8a8f"], [0.4, "#ff2a33"], [0.75, "#b0121a"], [1, "#3d0407"]], "rgba(255,230,230,0.85)") }),
    };
  }, []);
  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    const t = progress.current;
    // A quick celebratory spin as the range arrives; the logo itself is already on stage (matches the poster).
    const spinIn = easeInOutCubic(seg(t, 0.15, 1.4));
    g.scale.setScalar(0.0135 * (1 + Math.sin(spinIn * Math.PI) * 0.06));
    g.rotation.y = spinIn * Math.PI * 2 + Math.sin(state.clock.elapsedTime * 0.55) * 0.28;
    g.position.y = 2.42 + Math.sin(state.clock.elapsedTime * 0.8) * 0.05;
  });
  return (
    <group ref={group} position={[0, 2.42, -0.4]} scale={0.0135}>
      <mesh geometry={a} material={mats.a} />
      <mesh geometry={swoosh} material={mats.s} />
    </group>
  );
}

function Floor({ progress }: { progress: React.MutableRefObject<number> }) {
  const ring = useRef<THREE.Group>(null);
  const m = useMemo(() => {
    const glow = radial("rgba(225,29,38,0.55)", "rgba(225,29,38,0)");
    return {
      ring: new THREE.MeshBasicMaterial({ color: "#ff2a33", transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
      glow: new THREE.MeshBasicMaterial({ map: glow, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
      back: new THREE.MeshBasicMaterial({ map: radial("rgba(225,29,38,0.32)", "rgba(225,29,38,0)"), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
    };
  }, []);
  useFrame((state) => {
    const t = progress.current;
    const k = 1;
    if (ring.current) ring.current.scale.setScalar(1 + Math.sin(easeOutCubic(seg(t, 0.4, 1.2)) * Math.PI) * 0.04);
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.6) * 0.08;
    m.ring.opacity = 0.75 * k * pulse;
    m.glow.opacity = k;
    m.back.opacity = 1;
  });
  return (
    <group>
      <group ref={ring}>
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.005, 0]} material={m.ring} scale={[1, RZ / RX, 1]}>
          <ringGeometry args={[R - 0.025, R + 0.025, 160]} />
        </mesh>
      </group>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.004, 0]} scale={[R * 2.4, R * 2.4, 1]} material={m.glow}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      {/* Red bloom behind the logo */}
      <mesh position={[0, 2.0, -2.2]} scale={[8, 6, 1]} material={m.back}>
        <planeGeometry args={[1, 1]} />
      </mesh>
    </group>
  );
}

function Dust({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null);
  const { geometry, material } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const red = new THREE.Color("#ff4d55");
    const white = new THREE.Color("#ffffff");
    for (let i = 0; i < count; i++) {
      const r = 1 + Math.random() * 6.5;
      const a = Math.random() * Math.PI * 2;
      pos.set([Math.sin(a) * r, Math.random() * 4.5, Math.cos(a) * r - 1], i * 3);
      const c = Math.random() < 0.55 ? red : white;
      col.set([c.r, c.g, c.b], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const m = new THREE.PointsMaterial({ size: 0.03, vertexColors: true, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true });
    return { geometry: g, material: m };
  }, [count]);
  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += Math.min(delta, 0.1) * 0.02;
    ref.current.position.y = (ref.current.position.y + Math.min(delta, 0.1) * 0.05) % 0.6;
  });
  return <points ref={ref} geometry={geometry} material={material} />;
}

function Product({ index, set, progress, ringRot, hoverRef, frontRef, onClick }: {
  index: number;
  set: Record<string, Mesh3D>;
  progress: React.MutableRefObject<number>;
  ringRot: React.MutableRefObject<number>;
  hoverRef: React.MutableRefObject<boolean>;
  frontRef: React.MutableRefObject<number>;
  onClick: () => void;
}) {
  const item = SHOWCASE[index]!;
  const group = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const hovered = useRef(false);
  const angle = (index / N) * Math.PI * 2;
  const slot = useMemo(() => new THREE.Vector3(), []);
  const from = useMemo(() => new THREE.Vector3(), []);
  const cur = useRef(0);
  const def = item.def;
  const baseY = def.kind === "ball" ? 0.55 : 0.12 + (def.height / 2);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const t = progress.current;
    const time = state.clock.elapsedTime;
    const dt = Math.min(delta, 0.1);
    const start = 0.2 + index * 0.075;
    const k = easeOutCubic(seg(t, start, 1.25));
    // Position on the elliptical track, and how close it is to the front (1 = nearest the camera).
    const w = angle + ringRot.current;
    slot.set(Math.sin(w) * RX, 0, Math.cos(w) * RZ);
    from.set(slot.x * 3.2, 3.5, slot.z * 3.2 - 2);
    const front = Math.max(0, Math.cos(w));
    const focus = Math.pow(front, 6);
    cur.current = THREE.MathUtils.damp(cur.current, hovered.current ? 1 : focus, 5, dt);
    g.position.lerpVectors(from, slot, k);
    g.position.y += baseY + Math.sin(time * 0.8 + index * 1.3) * 0.04 + cur.current * 0.16;
    // Face the viewer (never edge-on), with a gentle sway so the 3D form reads; spin in on arrival.
    g.rotation.y = Math.sin(time * 0.5 + index * 0.9) * 0.28 - Math.sin(w) * 0.25 + (1 - k) * Math.PI * 2;
    const s = Math.max(0.0001, 0.86 * k * (1 + cur.current * 0.16));
    g.scale.setScalar(s);
    if (def.kind === "ball" && spin.current) {
      spin.current.rotation.y += dt * 0.7;
      spin.current.rotation.x = Math.sin(time * 0.5 + index) * 0.35;
    }
    // Whichever product is nearest the front owns the caption (half a slot either side).
    if (Math.cos(w) > Math.cos(Math.PI / N)) frontRef.current = index;
  });

  return (
    <group
      ref={group}
      scale={0.0001}
      onPointerOver={(e) => {
        e.stopPropagation();
        hovered.current = true;
        hoverRef.current = true;
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        hovered.current = false;
        hoverRef.current = false;
        document.body.style.cursor = "";
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <group ref={spin}>
        {def.kind === "ball" && <ProBall radius={0.4} panel={def.panel} base={def.base} />}
        {def.kind === "single" && (
          <mesh geometry={set[def.asset]!.geometry} material={set[def.asset]!.materials} scale={[def.height, def.height, def.height * (def.depth / 0.06)]} />
        )}
        {def.kind === "pair" && (
          <>
            <mesh geometry={set[def.palm]!.geometry} material={set[def.palm]!.materials} scale={def.height} position={[-0.26, 0, -0.08]} rotation={[0, 0.3, 0.1]} />
            <mesh geometry={set[def.back]!.geometry} material={set[def.back]!.materials} scale={def.height} position={[0.24, 0.04, 0.06]} rotation={[0, -0.12, -0.06]} />
          </>
        )}
      </group>
    </group>
  );
}

function Stage({ props, onCompiled }: { props: ShowcaseSceneProps; onCompiled: () => void }) {
  const names = useMemo(
    () => SHOWCASE.flatMap((s) => (s.def.kind === "single" ? [s.def.asset] : s.def.kind === "pair" ? [s.def.palm, s.def.back] : [])),
    [],
  );
  const set = useInflatedSet(names);
  const progress = useRef(props.settled ? END : 0);
  const [compiled, setCompiled] = useState(false);
  const ringRot = useRef(0);
  const frontRef = useRef(0);
  const lastFront = useRef(-1);
  const { gl, scene, camera, pointer } = useThree();
  const onCompiledRef = useRef(onCompiled);
  onCompiledRef.current = onCompiled;
  const onFrontRef = useRef(props.onFront);
  onFrontRef.current = props.onFront;

  useEffect(() => {
    if (!set || compiled) return;
    let alive = true;
    scene.traverse((o) => {
      const mats = (o as THREE.Mesh).material ? ([] as THREE.Material[]).concat((o as THREE.Mesh).material as THREE.Material) : [];
      mats.forEach((mt) => {
        const map = (mt as THREE.MeshLambertMaterial).map;
        if (map) gl.initTexture(map);
      });
    });
    gl.compileAsync(scene, camera).then(() => {
      if (!alive) return;
      setCompiled(true);
      onCompiledRef.current();
    });
    return () => {
      alive = false;
    };
  }, [set, compiled, gl, scene, camera]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    if (props.settled) progress.current = END;
    else if (compiled) progress.current = Math.min(END, progress.current + dt);
    const t = progress.current;
    // Camera glides in from high and far as the range arrives.
    camera.position.set(pointer.x * 0.35, 2.0 + pointer.y * 0.12, 8.4);
    camera.lookAt(0, 1.32, 0);
    // Orbit: slow auto-rotation (paused while a product is hovered) plus drag.
    const auto = props.still ? 0 : props.hoverRef.current ? 0 : 0.13 * easeOutCubic(seg(t, 2.2, 1.2));
    ringRot.current += auto * dt + props.dragRef.current;
    props.dragRef.current = 0;
    if (frontRef.current !== lastFront.current) {
      lastFront.current = frontRef.current;
      onFrontRef.current?.(frontRef.current);
    }
  });

  return (
    <>
      <Floor progress={progress} />
      <Logo progress={progress} />
      <group>
        {set &&
          !props.bare &&
          SHOWCASE.map((s, i) => (
            <Product key={s.key} index={i} set={set} progress={progress} ringRot={ringRot} hoverRef={props.hoverRef} frontRef={frontRef} onClick={() => props.onItemClick?.(s.href)} />
          ))}
      </group>
    </>
  );
}

export default function ShowcaseScene(props: ShowcaseSceneProps) {
  const quality = useMemo(() => deviceQuality(), []);
  // Render at the screen's real sharpness (phones are 2–3×): capped at 2, and 1.5 only on genuinely weak devices.
  const native = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
  const top = props.still ? 2 : Math.min(native, quality === "high" ? 3 : 1.5);
  const [dpr, setDpr] = useState(top);
  const [ready, setReady] = useState(false);
  const onReady = props.onReady;
  const onCompiled = useMemo(
    () => () => {
      setReady(true);
      onReady?.();
    },
    [onReady],
  );
  return (
    <Canvas
      className={props.className}
      frameloop={ready && (props.active || props.still) ? "always" : "never"}
      dpr={dpr}
      camera={{ position: [0, 2.0, 8.4], fov: 34 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance", preserveDrawingBuffer: !!props.still }}
      onCreated={({ gl }) => {
        // Error-checking every shader forces the browser to finish compiling synchronously (a long freeze on Windows).
        gl.debug.checkShaderErrors = process.env.NODE_ENV !== "production";
      }}
    >
      <fog attach="fog" args={["#0b0c0e", 7.4, 12.5]} />
      {/* If frames get slow, step down gently — never below 1.25 (that is what made products look pixelated). */}
      {!props.still && <PerformanceMonitor onDecline={() => setDpr(Math.max(1.5, Math.min(top, 2)))} onIncline={() => setDpr(top)} />}
      <ambientLight intensity={1.05} />
      <hemisphereLight args={["#ffffff", "#2a1012", 0.55]} />
      <directionalLight position={[2.5, 4, 5]} intensity={1.4} />
      <directionalLight position={[-4, 2, -3]} intensity={1.0} color="#ff4d55" />
      <Dust count={quality === "high" ? 420 : 200} />
      <Stage props={props} onCompiled={onCompiled} />
    </Canvas>
  );
}
