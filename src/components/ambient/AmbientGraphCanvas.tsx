"use client";

import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import { generateAmbientGraph } from "./ambientGraphData";

const STAGGER = 0.22;
const HOLD_SECONDS = 5.5;
const NODE_OPACITY = 0.55;
const EDGE_OPACITY = 0.16;

function AmbientNode({
  position,
  size,
  order,
  stagger,
  buildSeconds,
  buildHoldSeconds,
  startRef,
}: {
  position: [number, number, number];
  size: number;
  order: number;
  stagger: number;
  buildSeconds: number;
  buildHoldSeconds: number;
  startRef: React.MutableRefObject<number>;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const revealAt = order * stagger;
  const vanishAt = buildSeconds - stagger - revealAt;

  useFrame((state) => {
    const t = state.clock.elapsedTime - startRef.current;
    let target = 0;
    if (t >= 0 && t < buildHoldSeconds) {
      const local = t - revealAt;
      target = local > 0 ? Math.min(1, local * 1.8) : 0;
    } else if (t >= buildHoldSeconds) {
      const local = t - buildHoldSeconds - vanishAt;
      target = local > 0 ? Math.max(0, 1 - local * 1.8) : 1;
    }
    if (ref.current) {
      const s = THREE.MathUtils.lerp(ref.current.scale.x, target, 0.12);
      ref.current.scale.setScalar(Math.max(0.0001, s));
    }
  });

  return (
    <mesh ref={ref} position={position} scale={0.0001}>
      <sphereGeometry args={[size, 8, 8]} />
      <meshBasicMaterial color="#4fd1c5" transparent opacity={NODE_OPACITY} />
    </mesh>
  );
}

function AmbientEdge({
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
      target = local > 0 ? Math.min(EDGE_OPACITY, local * 1.3) : 0;
    } else if (t >= buildHoldSeconds) {
      const local = t - buildHoldSeconds - vanishAt;
      target = local > 0 ? Math.max(0, EDGE_OPACITY - local * 1.3) : EDGE_OPACITY;
    }
    const mat = ref.current?.material;
    if (mat) {
      mat.opacity = THREE.MathUtils.lerp(mat.opacity, target, 0.1);
    }
  });

  return (
    // @ts-expect-error -- drei's Line ref type doesn't expose `.material` cleanly
    <Line ref={ref} points={points} color={color} lineWidth={1} transparent opacity={0} />
  );
}

function AmbientScene({
  nodeCount,
  seed,
  radius,
  rotationSpeed,
}: {
  nodeCount: number;
  seed: number;
  radius: number;
  rotationSpeed: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [cycle, setCycle] = useState(0);
  const startRef = useRef(0);

  const graph = useMemo(
    () => generateAmbientGraph(seed + cycle * 7919, nodeCount, radius),
    [seed, cycle, nodeCount, radius]
  );

  const buildSeconds = nodeCount * STAGGER;
  const buildHoldSeconds = buildSeconds + HOLD_SECONDS;
  const cycleSeconds = buildHoldSeconds + buildSeconds;

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * rotationSpeed;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.05) * 0.08;
    }
    const t = state.clock.elapsedTime - startRef.current;
    if (t >= cycleSeconds) {
      startRef.current = state.clock.elapsedTime;
      setCycle((c) => c + 1);
    }
  });

  return (
    <group ref={groupRef}>
      {graph.nodes.map((n) => (
        <AmbientNode
          key={`${cycle}-${n.id}`}
          position={n.position}
          size={n.size}
          order={n.order}
          stagger={STAGGER}
          buildSeconds={buildSeconds}
          buildHoldSeconds={buildHoldSeconds}
          startRef={startRef}
        />
      ))}
      {graph.edges.map((e, i) => (
        <AmbientEdge
          key={`${cycle}-${i}`}
          a={e.a}
          b={e.b}
          color={e.color}
          revealOrder={e.revealOrder}
          stagger={STAGGER}
          buildSeconds={buildSeconds}
          buildHoldSeconds={buildHoldSeconds}
          startRef={startRef}
        />
      ))}
    </group>
  );
}

export default function AmbientGraphCanvas({
  nodeCount,
  seed,
  radius,
  rotationSpeed,
}: {
  nodeCount: number;
  seed: number;
  radius: number;
  rotationSpeed: number;
}) {
  return (
    <Canvas
      camera={{ position: [0, 0, radius * 1.5], fov: 40 }}
      dpr={[1, 1.3]}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.6} />
      <AmbientScene nodeCount={nodeCount} seed={seed} radius={radius} rotationSpeed={rotationSpeed} />
    </Canvas>
  );
}
