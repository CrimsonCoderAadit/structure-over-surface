"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Line } from "@react-three/drei";
import * as THREE from "three";
import {
  LAID_OUT,
  EDGES_RESOLVED,
  STAGGER,
  CYCLE_SECONDS,
} from "./graphData";

function GraphNode({ position, depth, order }: { position: [number, number, number]; depth: number; order: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const revealAt = order * STAGGER;
  const size = depth === 0 ? 0.15 : depth === 1 ? 0.1 : depth === 2 ? 0.075 : 0.055;

  useFrame((state) => {
    const t = state.clock.elapsedTime % CYCLE_SECONDS;
    const local = t - revealAt;
    const target = local > 0 ? Math.min(1, local * 3.2) : 0;
    if (ref.current) {
      const s = THREE.MathUtils.lerp(ref.current.scale.x, target, 0.22);
      ref.current.scale.setScalar(Math.max(0.0001, s));
    }
  });

  return (
    <mesh ref={ref} position={position} scale={0.0001}>
      <sphereGeometry args={[size, 14, 14]} />
      <meshStandardMaterial
        color={depth === 0 ? "#4fd1c5" : "#e8e6e1"}
        emissive={depth === 0 ? "#4fd1c5" : "#13151a"}
        emissiveIntensity={depth === 0 ? 0.6 : 0.1}
        roughness={0.45}
        metalness={0.1}
      />
    </mesh>
  );
}

function GraphEdge({
  a,
  b,
  color,
  revealOrder,
}: {
  a: [number, number, number];
  b: [number, number, number];
  color: string;
  revealOrder: number;
}) {
  const ref = useRef<{ material: THREE.Material & { opacity: number } } | null>(null);
  const revealAt = revealOrder * STAGGER + 0.06;
  const points = useMemo(() => [a, b] as [number, number, number][], [a, b]);

  useFrame((state) => {
    const t = state.clock.elapsedTime % CYCLE_SECONDS;
    const local = t - revealAt;
    const target = local > 0 ? Math.min(0.5, local * 2.2) : 0;
    const mat = ref.current?.material;
    if (mat) {
      mat.opacity = THREE.MathUtils.lerp(mat.opacity, target, 0.18);
    }
  });

  return (
    // @ts-expect-error -- drei's Line ref type doesn't expose `.material` cleanly
    <Line ref={ref} points={points} color={color} lineWidth={1} transparent opacity={0} />
  );
}

function Scene() {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.06;
  });

  return (
    <group ref={groupRef}>
      {LAID_OUT.map((n) => (
        <GraphNode key={n.id} position={n.position} depth={n.depth} order={n.order} />
      ))}
      {EDGES_RESOLVED.map((e, i) => (
        <GraphEdge key={i} a={e.a} b={e.b} color={e.color} revealOrder={e.revealOrder} />
      ))}
    </group>
  );
}

export default function ASTGraphCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 0.6, 8.5], fov: 42 }}
      dpr={[1, 1.6]}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.5} />
      <pointLight position={[6, 6, 6]} intensity={40} color="#e8e6e1" />
      <pointLight position={[-6, -4, -4]} intensity={20} color="#4fd1c5" />
      <Scene />
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate={false}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={(Math.PI * 2) / 3}
      />
    </Canvas>
  );
}
