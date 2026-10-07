"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { bakeJersey, createProjectedMaterial } from "./projected-material";

/**
 * Opening scene, premium-packaging style: the lid of an Alrobel presentation
 * box lifts off and comes to rest standing behind it (big logo facing you), a
 * red glow spills out and three finished kits rise and float — "your vision,
 * our creation", made and shipped. ~3 s intro, then an idle float that
 * follows the pointer and the scroll. Clicking a kit opens the Design Studio.
 */

export type BoxArt = { front: HTMLCanvasElement; lid: HTMLCanvasElement; side: HTMLCanvasElement };

export type UnboxSceneProps = {
  kits: HTMLCanvasElement[];
  boxArt: BoxArt;
  active: boolean;
  /** Skip the intro and render the final pose (poster capture, reduced motion). */
  settled?: boolean;
  still?: boolean;
  onKitClick?: () => void;
  className?: string;
};

const MODEL_URL = "/models/jersey.glb";
const W = 1.7; // base width (x)
const D = 1.15; // base depth (z)
const H = 0.62; // base height (y)
const T = 0.025; // board thickness
const LW = W + 0.05; // lid outer size
const LD = D + 0.05;
const LH = 0.16;
const END = 3.4; // seconds until the intro is fully settled

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeOutCubic = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
const easeInOutCubic = (x: number) => {
  const t = clamp01(x);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
const easeOutBack = (x: number) => {
  const c1 = 1.4;
  const c3 = c1 + 1;
  const t = clamp01(x);
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const seg = (t: number, start: number, dur: number) => clamp01((t - start) / dur);

// Final poses for the kits: centre, left, right.
const POSES = [
  { pos: new THREE.Vector3(0, 1.22, 0.22), rotY: 0, scale: 0.64 },
  { pos: new THREE.Vector3(-1.12, 1.0, 0.0), rotY: 0.55, scale: 0.53 },
  { pos: new THREE.Vector3(1.12, 1.0, 0.0), rotY: -0.55, scale: 0.53 },
];

function useCanvasTexture(canvas: HTMLCanvasElement) {
  return useMemo(() => {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [canvas]);
}

function PrintedFace({ map, position, rotation, size }: { map: THREE.Texture; position: [number, number, number]; rotation?: [number, number, number]; size: [number, number] }) {
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={size} />
      <meshStandardMaterial map={map} roughness={0.82} />
    </mesh>
  );
}

function Box({ progress, boxArt }: { progress: React.MutableRefObject<number>; boxArt: BoxArt }) {
  const frontTex = useCanvasTexture(boxArt.front);
  const lidTex = useCanvasTexture(boxArt.lid);
  const sideTex = useCanvasTexture(boxArt.side);
  const board = useMemo(() => new THREE.MeshStandardMaterial({ color: "#16181c", roughness: 0.86, metalness: 0.02 }), []);
  const inner = useMemo(() => new THREE.MeshStandardMaterial({ color: "#26292f", roughness: 0.95, side: THREE.DoubleSide }), []);
  const tissue = useMemo(() => new THREE.MeshStandardMaterial({ color: "#c8231a", roughness: 0.7, emissive: new THREE.Color("#5a0a0c"), emissiveIntensity: 0.6 }), []);
  const glow = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ff2a33", transparent: true, opacity: 0, depthWrite: false }), []);
  const lid = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);

  // Lid path: closed on top → lifted (logo tilted to the camera) → rises up and away out of view.
  const closed = useMemo(() => ({ pos: new THREE.Vector3(0, H + LH / 2, 0), rotX: 0 }), []);
  const lifted = useMemo(() => ({ pos: new THREE.Vector3(0, H + 0.85, 0.15), rotX: 0.5 }), []);
  const rest = useMemo(() => ({ pos: new THREE.Vector3(0.4, 4.6, -2.6), rotX: 0.9 }), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const t = progress.current;
    const up = easeOutCubic(seg(t, 0.15, 0.75));
    const back = easeInOutCubic(seg(t, 1.0, 1.1));
    if (lid.current) {
      tmp.copy(closed.pos).lerp(lifted.pos, up).lerp(rest.pos, back);
      lid.current.position.copy(tmp);
      lid.current.rotation.x = THREE.MathUtils.lerp(THREE.MathUtils.lerp(closed.rotX, lifted.rotX, up), rest.rotX, back);
      lid.current.rotation.z = -0.25 * back;
      lid.current.visible = back < 0.999;
    }
    const g = easeOutCubic(seg(t, 0.4, 0.8));
    glow.opacity = 0.5 * g;
    if (light.current) light.current.intensity = 5.5 * g;
  });

  return (
    <group>
      {/* Base walls + printed faces */}
      <mesh position={[0, H / 2, D / 2]} material={board}>
        <boxGeometry args={[W, H, T]} />
      </mesh>
      <PrintedFace map={frontTex} position={[0, H / 2, D / 2 + T / 2 + 0.001]} size={[W, H]} />
      <mesh position={[0, H / 2, -D / 2]} material={board}>
        <boxGeometry args={[W, H, T]} />
      </mesh>
      <mesh position={[-W / 2, H / 2, 0]} material={board}>
        <boxGeometry args={[T, H, D]} />
      </mesh>
      <PrintedFace map={sideTex} position={[-W / 2 - T / 2 - 0.001, H / 2, 0]} rotation={[0, -Math.PI / 2, 0]} size={[D, H]} />
      <mesh position={[W / 2, H / 2, 0]} material={board}>
        <boxGeometry args={[T, H, D]} />
      </mesh>
      <PrintedFace map={sideTex} position={[W / 2 + T / 2 + 0.001, H / 2, 0]} rotation={[0, Math.PI / 2, 0]} size={[D, H]} />
      <mesh position={[0, 0.01, 0]} rotation-x={-Math.PI / 2} material={inner}>
        <planeGeometry args={[W - T, D - T]} />
      </mesh>
      <mesh position={[0, H / 2, D / 2 - T]} material={inner}>
        <planeGeometry args={[W - 2 * T, H]} />
      </mesh>
      <mesh position={[0, H / 2, -D / 2 + T]} material={inner}>
        <planeGeometry args={[W - 2 * T, H]} />
      </mesh>
      {/* Red tissue paper folded over the rim */}
      <mesh position={[-W / 2 + 0.2, H - 0.01, 0]} rotation={[-Math.PI / 2, 0, 0.12]} material={tissue}>
        <planeGeometry args={[0.55, D - 0.12]} />
      </mesh>
      <mesh position={[W / 2 - 0.2, H - 0.01, 0]} rotation={[-Math.PI / 2, 0, -0.12]} material={tissue}>
        <planeGeometry args={[0.55, D - 0.12]} />
      </mesh>
      <mesh position={[0, H - 0.015, 0]} rotation-x={-Math.PI / 2} material={glow}>
        <planeGeometry args={[W - 0.12, D - 0.12]} />
      </mesh>
      <pointLight ref={light} position={[0, H * 0.7, 0.1]} color="#ff2a33" intensity={0} distance={4} decay={1.6} />

      {/* Lid: shell with printed top */}
      <group ref={lid} position={[0, H + LH / 2, 0]}>
        <mesh position={[0, LH / 2 - T / 2, 0]} material={board}>
          <boxGeometry args={[LW, T, LD]} />
        </mesh>
        <PrintedFace map={lidTex} position={[0, LH / 2 + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]} size={[LW, LD]} />
        <mesh position={[0, 0, LD / 2]} material={board}>
          <boxGeometry args={[LW, LH, T]} />
        </mesh>
        <mesh position={[0, 0, -LD / 2]} material={board}>
          <boxGeometry args={[LW, LH, T]} />
        </mesh>
        <mesh position={[-LW / 2, 0, 0]} material={board}>
          <boxGeometry args={[T, LH, LD]} />
        </mesh>
        <mesh position={[LW / 2, 0, 0]} material={board}>
          <boxGeometry args={[T, LH, LD]} />
        </mesh>
      </group>
    </group>
  );
}

function Kits({ kits, progress, onKitClick }: { kits: HTMLCanvasElement[]; progress: React.MutableRefObject<number>; onKitClick?: () => void }) {
  const { scene } = useGLTF(MODEL_URL, false, true);
  const baked = useMemo(() => bakeJersey(scene), [scene]);
  const materials = useMemo(() => kits.map((c) => createProjectedMaterial(c, baked.min, baked.max).material), [kits, baked]);
  const groups = useRef<(THREE.Group | null)[]>([]);
  const hovered = useRef<number | null>(null);
  const spin = useRef([0, 0, 0]);

  useFrame((state, delta) => {
    const t = progress.current;
    const time = state.clock.elapsedTime;
    const dt = Math.min(delta, 1 / 30);
    groups.current.forEach((g, i) => {
      if (!g) return;
      const pose = POSES[i]!;
      const start = 1.0 + i * 0.22;
      const rise = easeOutBack(seg(t, start, 1.1));
      const startY = 0.2;
      g.visible = t > start - 0.05;
      g.position.set(pose.pos.x * rise, startY + (pose.pos.y - startY) * rise + Math.sin(time * 0.9 + i * 1.7) * 0.03 * rise, pose.pos.z * rise);
      g.scale.setScalar(0.22 + (pose.scale - 0.22) * easeOutCubic(seg(t, start, 0.9)));
      const target = hovered.current === i ? 0 : pose.rotY + Math.sin(time * 0.45 + i) * 0.16;
      spin.current[i] = THREE.MathUtils.damp(spin.current[i]!, target, 3, dt);
      g.rotation.y = spin.current[i]! + (1 - rise) * Math.PI * 2;
    });
  });

  return (
    <>
      {materials.map((m, i) => (
        <group
          key={i}
          visible={false}
          ref={(el) => {
            groups.current[i] = el;
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            hovered.current = i;
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            hovered.current = null;
            document.body.style.cursor = "";
          }}
          onClick={(e) => {
            e.stopPropagation();
            onKitClick?.();
          }}
        >
          {baked.geometries.map((geo, j) => (
            <mesh key={j} geometry={geo} material={m} />
          ))}
        </group>
      ))}
    </>
  );
}

function Sparks({ progress }: { progress: React.MutableRefObject<number> }) {
  const COUNT = 54;
  const mesh = useRef<THREE.InstancedMesh>(null);
  const seeds = useMemo(
    () =>
      Array.from({ length: COUNT }, () => ({
        x: (Math.random() - 0.5) * (W - 0.4),
        z: (Math.random() - 0.5) * (D - 0.4),
        vy: 1.0 + Math.random() * 1.5,
        vx: (Math.random() - 0.5) * 1.1,
        vz: (Math.random() - 0.5) * 0.6,
        delay: Math.random() * 0.6,
        size: 0.01 + Math.random() * 0.018,
      })),
    [],
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const material = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ff4d55", transparent: true, opacity: 0.95 }), []);
  useFrame(() => {
    const t = progress.current;
    if (!mesh.current) return;
    seeds.forEach((s, i) => {
      const life = clamp01((t - 0.85 - s.delay) / 1.4);
      const alive = life > 0 && life < 1;
      dummy.position.set(s.x + s.vx * life, H + s.vy * life - 0.85 * life * life, s.z + s.vz * life);
      dummy.scale.setScalar(alive ? s.size * (1 - life) * 6 : 0);
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, COUNT]} material={material}>
      <sphereGeometry args={[1, 6, 6]} />
    </instancedMesh>
  );
}

function Stage({ props }: { props: UnboxSceneProps }) {
  const progress = useRef(props.settled ? END : 0);
  const frames = useRef(0);
  const rig = useRef<THREE.Group>(null);
  const { pointer } = useThree();
  const scrollY = useRef(0);
  useEffect(() => {
    const onScroll = () => (scrollY.current = window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useFrame((_, delta) => {
    // Hold for a few frames (shader compile hitches), and cap the step so a
    // slow frame never skips the intro.
    frames.current += 1;
    if (props.settled) progress.current = END;
    else if (frames.current > 3) progress.current = Math.min(END, progress.current + Math.min(delta, 1 / 30));
    if (!rig.current) return;
    const dt = Math.min(delta, 1 / 30);
    const scroll = Math.min(1, scrollY.current / 700);
    rig.current.rotation.y = THREE.MathUtils.damp(rig.current.rotation.y, -0.22 + pointer.x * 0.22 + scroll * 0.45, 3, dt);
    rig.current.rotation.x = THREE.MathUtils.damp(rig.current.rotation.x, -pointer.y * 0.04, 3, dt);
  });
  return (
    <group ref={rig} position={[0, -0.5, 0]}>
      <Box progress={progress} boxArt={props.boxArt} />
      <Kits kits={props.kits} progress={progress} onKitClick={props.onKitClick} />
      {!props.settled && <Sparks progress={progress} />}
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

export default function UnboxScene(props: UnboxSceneProps) {
  return (
    <Canvas
      className={props.className}
      frameloop={props.active || props.still ? "always" : "never"}
      dpr={[1, 1.6]}
      camera={{ position: [0, 0.95, 4.7], fov: 34 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance", preserveDrawingBuffer: !!props.still }}
      onCreated={({ camera }) => camera.lookAt(0, 0.4, 0)}
    >
      <FrameGate active={props.active} />
      <ambientLight intensity={0.32} />
      <directionalLight position={[2.5, 3.2, 3.5]} intensity={1.8} />
      <directionalLight position={[-3.5, 1.5, -2]} intensity={1.1} color="#ff5a5f" />
      <Environment resolution={128}>
        <Lightformer form="rect" intensity={2.2} position={[0, 3, 3]} scale={[5, 2, 1]} />
        <Lightformer form="rect" intensity={1.1} position={[-3.5, 0.6, 1]} rotation-y={Math.PI / 2} scale={[3, 2, 1]} />
        <Lightformer form="rect" intensity={1.4} position={[3.5, 0.6, -1]} rotation-y={-Math.PI / 2} scale={[3, 2, 1]} color="#ff4d55" />
      </Environment>
      <Stage props={props} />
      <ContactShadows position={[0, -0.5, 0]} opacity={0.55} scale={6} blur={2.4} far={2} resolution={256} frames={props.settled ? 1 : Infinity} />
    </Canvas>
  );
}

useGLTF.preload(MODEL_URL, false, true);
