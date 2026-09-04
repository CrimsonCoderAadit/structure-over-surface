import type { ASTGraph } from "./graphTypes";

export interface LaidOutNode {
  id: string;
  type: string;
  depth: number;
  position: [number, number, number];
  order: number;
}

// Deterministic spherical layout: depth maps to the polar angle (root at the
// top pole, deepest nodes fan out toward the bottom), DFS leaf order maps to
// the azimuthal angle. No physics simulation: same graph always lays out the
// same way, which matters when the whole point is "structure, not noise."
export function layoutGraph(graph: ASTGraph, radius = 3.4): LaidOutNode[] {
  const childrenOf = new Map<string, string[]>();
  for (const n of graph.nodes) {
    if (n.parent) {
      if (!childrenOf.has(n.parent)) childrenOf.set(n.parent, []);
      childrenOf.get(n.parent)!.push(n.id);
    }
  }

  const root = graph.nodes.find((n) => n.parent === null);
  if (!root) return [];

  const maxDepth = Math.max(1, ...graph.nodes.map((n) => n.depth));
  let leafCursor = 0;
  const range = new Map<string, [number, number]>();

  function visit(id: string) {
    const kids = childrenOf.get(id) ?? [];
    if (kids.length === 0) {
      range.set(id, [leafCursor, leafCursor + 1]);
      leafCursor += 1;
      return;
    }
    const start = leafCursor;
    for (const k of kids) visit(k);
    range.set(id, [start, leafCursor]);
  }
  visit(root.id);

  const totalLeaves = Math.max(1, leafCursor);
  const positions: LaidOutNode[] = [];

  graph.nodes.forEach((n, order) => {
    const [s, e] = range.get(n.id) ?? [0, 1];
    const mid = (s + e) / 2;
    const theta = (mid / totalLeaves) * Math.PI * 2;
    const phi = n.depth === 0 ? 0.001 : (n.depth / maxDepth) * Math.PI * 0.86 + 0.08;

    const r = radius;
    const y = r * Math.cos(phi);
    const ringRadius = r * Math.sin(phi);
    const x = ringRadius * Math.cos(theta);
    const z = ringRadius * Math.sin(theta);

    positions.push({ id: n.id, type: n.type, depth: n.depth, position: [x, y, z], order });
  });

  return positions;
}
