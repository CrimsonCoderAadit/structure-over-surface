"use client";

import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Line } from "@react-three/drei";
import * as THREE from "three";
import { HERO_GRAPH_SETS } from "./graphData";

function GraphNode({
  position,
  depth,
  order,
  stagger,
  buildSeconds,
  buildHoldSeconds,
  startRef,
}: {
  position: [number, number, number];
  depth: number;
  order: number;
  stagger: number;
  buildSeconds: number;
  buildHoldSeconds: number;
  startRef: React.MutableRefObject<number>;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const revealAt = order * stagger;
  // Mirrors revealAt across the build window, so the last node to appear is
  // the first to vanish.
  const vanishAt = buildSeconds - stagger - revealAt;
  const size = depth === 0 ? 0.15 : depth === 1 ? 0.1 : depth === 2 ? 0.075 : 0.055;

  useFrame((state) => {
    const t = state.clock.elapsedTime - startRef.current;
    let target = 0;
    if (t >= 0 && t < buildHoldSeconds) {
      const local = t - revealAt;
      target = local > 0 ? Math.min(1, local * 3.2) : 0;
    } else if (t >= buildHoldSeconds) {
      const local = t - buildHoldSeconds - vanishAt;
      target = local > 0 ? Math.max(0, 1 - local * 3.2) : 1;
    }
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
  stagger,
  buildSeconds,
  buildHoldSeconds,
  startRef,
}: {
  a: [number, number, number];
  b: [number, number, number];
  color: string;
  revealOrder: number;
  stagger: number;
  buildSeconds: number;
  buildHoldSeconds: number;
  startRef: React.MutableRefObject<number>;
}) {
  const ref = useRef<{ material: THREE.Material & { opacity: number } } | null>(null);
  const revealAt = revealOrder * stagger + 0.06;
  const vanishAt = buildSeconds - stagger - revealOrder * stagger;
  const points = useMemo(() => [a, b] as [number, number, number][], [a, b]);

  useFrame((state) => {
    const t = state.clock.elapsedTime - startRef.current;
    let target = 0;
    if (t >= 0 && t < buildHoldSeconds) {
      const local = t - revealAt;
      target = local > 0 ? Math.min(0.5, local * 2.2) : 0;
    } else if (t >= buildHoldSeconds) {
      const local = t - buildHoldSeconds - vanishAt;
      target = local > 0 ? Math.max(0, 0.5 - local * 2.2) : 0.5;
    }
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
  const [graphIndex, setGraphIndex] = useState(0);
  const startRef = useRef(0);

  const set = HERO_GRAPH_SETS[graphIndex];

  useFrame((state, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.06;

    const t = state.clock.elapsedTime - startRef.current;
    if (t >= set.cycleSeconds) {
      startRef.current = state.clock.elapsedTime;
      setGraphIndex((i) => (i + 1) % HERO_GRAPH_SETS.length);
    }
  });

  return (
    <group ref={groupRef}>
      {set.laidOut.map((n) => (
        <GraphNode
          key={`${graphIndex}-${n.id}`}
          position={n.position}
          depth={n.depth}
          order={n.order}
          stagger={set.stagger}
          buildSeconds={set.buildSeconds}
          buildHoldSeconds={set.buildHoldSeconds}
          startRef={startRef}
        />
      ))}
      {set.edges.map((e, i) => (
        <GraphEdge
          key={`${graphIndex}-${i}`}
          a={e.a}
          b={e.b}
          color={e.color}
          revealOrder={e.revealOrder}
          stagger={set.stagger}
          buildSeconds={set.buildSeconds}
          buildHoldSeconds={set.buildHoldSeconds}
          startRef={startRef}
        />
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
