import { LAID_OUT, EDGES_RESOLVED } from "./graphData";

// Static, non-animated projection of the same graph and layout used in the 3D
// scene. Shown when prefers-reduced-motion is set, WebGL is unavailable, or
// the canvas hasn't mounted yet. Same data, same colors, no motion.
export default function StaticGraphFallback() {
  const scale = 48;
  const cx = 210;
  const cy = 190;

  // Rounded to avoid server/client floating-point mismatches in trig output,
  // which otherwise trip a hydration warning on this SSR'd fallback.
  const round = (n: number) => Math.round(n * 100) / 100;
  const project = (p: [number, number, number]) => ({
    x: round(cx + p[0] * scale),
    y: round(cy - p[1] * scale),
  });

  return (
    <svg
      viewBox="0 0 420 380"
      className="w-full h-full"
      role="img"
      aria-label="A static diagram of an abstract syntax tree graph, with structural, sibling, and control-flow edges shown in their respective colors."
    >
      {EDGES_RESOLVED.map((e, i) => {
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
            opacity={0.45}
          />
        );
      })}
      {LAID_OUT.map((n) => {
        const p = project(n.position);
        const r = n.depth === 0 ? 6 : n.depth === 1 ? 4.2 : 3;
        return (
          <circle
            key={n.id}
            cx={p.x}
            cy={p.y}
            r={r}
            fill={n.depth === 0 ? "#4fd1c5" : "#e8e6e1"}
          />
        );
      })}
    </svg>
  );
}
