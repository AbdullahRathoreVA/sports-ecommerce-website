"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

/**
 * Shipping globe: a dark sphere with a red rim, a fine dot field and
 * lat/long lines; glowing great-circle routes run from Sialkot to each
 * destination with a travelling "shipment" dot and a pulsing pin on arrival.
 * Drag to spin (no zoom, so it never traps page scroll).
 */

export type Destination = { name: string; lat: number; lon: number };
export type GlobeSceneProps = { origin: Destination; destinations: Destination[]; active: boolean; className?: string };

const R = 1;
const RED = new THREE.Color("#e11d26");

function toVec(lat: number, lon: number, r = R) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
}

function arcPoints(a: THREE.Vector3, b: THREE.Vector3, segments = 64) {
  const pts: THREE.Vector3[] = [];
  const angle = a.angleTo(b);
  const lift = 0.06 + angle * 0.11;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const p = new THREE.Vector3().copy(a).normalize().lerp(b.clone().normalize(), t).normalize();
    // Slerp-ish via normalized lerp is fine for these distances; lift peaks mid-route.
    pts.push(p.multiplyScalar(R + Math.sin(Math.PI * t) * lift));
  }
  return pts;
}

function Sphere() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color("#0f1114") }, uRim: { value: RED } },
        vertexShader: `varying vec3 vN; varying vec3 vV;
          void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
        fragmentShader: `uniform vec3 uColor; uniform vec3 uRim; varying vec3 vN; varying vec3 vV;
          void main(){ float f = pow(1.0 - max(dot(vN, vV), 0.0), 3.4); gl_FragColor = vec4(mix(uColor, uRim, f*0.38), 1.0); }`,
      }),
    [],
  );
  const grid = useMemo(() => {
    const pts: number[] = [];
    for (let lat = -60; lat <= 60; lat += 30) {
      for (let lon = 0; lon < 360; lon += 4) {
        const a = toVec(lat, lon, R * 1.002);
        const b = toVec(lat, lon + 4, R * 1.002);
        pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    }
    for (let lon = 0; lon < 360; lon += 30) {
      for (let lat = -88; lat < 88; lat += 4) {
        const a = toVec(lat, lon, R * 1.002);
        const b = toVec(lat + 4, lon, R * 1.002);
        pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  const dots = useMemo(() => {
    const n = 2200;
    const arr = new Float32Array(n * 3);
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const th = golden * i;
      arr.set([Math.cos(th) * r * 1.004, y * 1.004, Math.sin(th) * r * 1.004], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return g;
  }, []);
  return (
    <>
      <mesh material={material}>
        <sphereGeometry args={[R, 64, 64]} />
      </mesh>
      <lineSegments geometry={grid}>
        <lineBasicMaterial color="#ffffff" transparent opacity={0.07} />
      </lineSegments>
      <points geometry={dots}>
        <pointsMaterial color="#ffffff" size={0.008} transparent opacity={0.35} sizeAttenuation />
      </points>
    </>
  );
}

function Route({ from, to, delay }: { from: THREE.Vector3; to: THREE.Vector3; delay: number }) {
  const points = useMemo(() => arcPoints(from, to), [from, to]);
  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);
  const line = useMemo(() => new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: RED, transparent: true, opacity: 0.85 })), [geometry]);
  const comet = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const normal = useMemo(() => to.clone().normalize(), [to]);

  useFrame((state) => {
    const t = state.clock.elapsedTime - delay;
    // Draw the route in, then keep a shipment dot travelling along it.
    const grow = Math.min(1, Math.max(0, t / 1.4));
    geometry.setDrawRange(0, Math.floor(points.length * grow));
    if (comet.current) {
      const k = ((t * 0.32) % 1 + 1) % 1;
      const p = points[Math.min(points.length - 1, Math.floor(k * (points.length - 1)))]!;
      comet.current.position.copy(p);
      comet.current.visible = grow >= 1;
    }
    if (ring.current) {
      const pulse = (state.clock.elapsedTime * 0.8 + delay) % 1;
      ring.current.scale.setScalar(0.02 + pulse * 0.07);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = (1 - pulse) * 0.8 * grow;
    }
  });

  const quat = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal), [normal]);
  return (
    <group>
      <primitive object={line} />
      <mesh ref={comet}>
        <sphereGeometry args={[0.014, 12, 12]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={to.clone().multiplyScalar(1.004)}>
        <sphereGeometry args={[0.016, 12, 12]} />
        <meshBasicMaterial color={RED} />
      </mesh>
      <mesh ref={ring} position={to.clone().multiplyScalar(1.005)} quaternion={quat}>
        <ringGeometry args={[0.8, 1, 32]} />
        <meshBasicMaterial color={RED} transparent side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

function OriginPulse({ at }: { at: THREE.Vector3 }) {
  const ring = useRef<THREE.Mesh>(null);
  const quat = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), at.clone().normalize()), [at]);
  useFrame((state) => {
    if (!ring.current) return;
    const p = (state.clock.elapsedTime * 0.6) % 1;
    ring.current.scale.setScalar(0.03 + p * 0.12);
    (ring.current.material as THREE.MeshBasicMaterial).opacity = (1 - p) * 0.9;
  });
  return (
    <mesh ref={ring} position={at.clone().multiplyScalar(1.006)} quaternion={quat}>
      <ringGeometry args={[0.75, 1, 40]} />
      <meshBasicMaterial color="#ffffff" transparent side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

function Globe({ origin, destinations }: Omit<GlobeSceneProps, "active" | "className">) {
  const from = useMemo(() => toVec(origin.lat, origin.lon), [origin]);
  const group = useRef<THREE.Group>(null);
  // Face the viewer at ~35°E: Sialkot on the right, Europe and the Gulf in view, USA routes arcing over the left edge.
  const startY = useMemo(() => (3 * Math.PI) / 2 - (35 * Math.PI) / 180, []);
  useEffect(() => {
    // Tilt so ~35°N faces the viewer: every route is in the northern hemisphere.
    if (group.current) group.current.rotation.set(0.6, startY, 0);
  }, [startY]);
  return (
    <group ref={group}>
      <Sphere />
      {destinations.map((d, i) => (
        <Route key={d.name} from={from} to={toVec(d.lat, d.lon)} delay={0.4 + i * 0.35} />
      ))}
      <mesh position={from.clone().multiplyScalar(1.006)}>
        <sphereGeometry args={[0.026, 16, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <OriginPulse at={from} />
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

export default function GlobeScene({ origin, destinations, active, className }: GlobeSceneProps) {
  return (
    <Canvas className={className} frameloop={active ? "always" : "never"} dpr={[1, 1.6]} camera={{ position: [0, 0, 3.55], fov: 38 }} gl={{ antialias: true, alpha: true }}>
      <FrameGate active={active} />
      <Globe origin={origin} destinations={destinations} />
      <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.35} rotateSpeed={0.5} minPolarAngle={Math.PI * 0.3} maxPolarAngle={Math.PI * 0.7} />
    </Canvas>
  );
}
