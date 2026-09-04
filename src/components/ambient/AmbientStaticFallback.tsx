import { generateAmbientGraph } from "./ambientGraphData";

// A single still frame of the same generator used by the animated version.
// Shown when prefers-reduced-motion is set or WebGL is unavailable. Faint
// enough to read as texture, not as a diagram asking to be read.
export default function AmbientStaticFallback({
  seed,
  nodeCount,
  radius,
}: {
  seed: number;
  nodeCount: number;
  radius: number;
}) {
  const { nodes, edges } = generateAmbientGraph(seed, nodeCount, radius);

  const W = 800;
  const H = 800;
  const cx = W / 2;
  const cy = H / 2;
  const scale = W / (radius * 3.2);
  const round = (n: number) => Math.round(n * 100) / 100;
  const project = (p: [number, number, number]) => ({
    x: round(cx + p[0] * scale),
    y: round(cy - p[1] * scale),
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {edges.map((e, i) => {
        const p1 = project(e.a);
        const p2 = project(e.b);
        return (
          <line
            key={i}
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke={e.color}
            strokeWidth={1}
            opacity={0.12}
          />
        );
      })}
      {nodes.map((n) => {
        const p = project(n.position);
        return <circle key={n.id} cx={p.x} cy={p.y} r={n.size * scale} fill="#4fd1c5" opacity={0.4} />;
      })}
    </svg>
  );
}
