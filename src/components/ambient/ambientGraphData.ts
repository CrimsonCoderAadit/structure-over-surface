import { EDGE_TYPES } from "@/lib/edgeTypes";
import type { EdgeTypeKey } from "@/lib/edgeTypes";

export interface AmbientNode {
  id: string;
  position: [number, number, number];
  order: number;
  size: number;
}

export interface AmbientEdge {
  a: [number, number, number];
  b: [number, number, number];
  color: string;
  revealOrder: number;
}

export interface AmbientGraph {
  nodes: AmbientNode[];
  edges: AmbientEdge[];
}

// Small deterministic PRNG so a given seed always produces the same loose
// scatter. No Math.random(), which would make the ambient graph reshuffle
// on every re-render instead of just every cycle.
function mulberry32(seed: number) {
  let a = seed;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A loose, sparse scatter of nodes with one edge each to an earlier node.
// Reads as texture (a graph existing somewhere behind the page), not as a
// second AST diagram competing with the hero or the demo panel.
export function generateAmbientGraph(seed: number, nodeCount: number, radius: number): AmbientGraph {
  const rand = mulberry32(seed);

  const nodes: AmbientNode[] = Array.from({ length: nodeCount }, (_, i) => {
    const theta = rand() * Math.PI * 2;
    const phi = Math.acos(2 * rand() - 1);
    const r = radius * (0.4 + rand() * 0.6);
    return {
      id: `m${i}`,
      position: [
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta) * 0.55,
        r * Math.cos(phi) * 0.7,
      ],
      order: i,
      size: 0.03 + rand() * 0.03,
    };
  });

  const kinds: EdgeTypeKey[] = ["structural", "sibling", "flow"];
  const edges: AmbientEdge[] = [];
  for (let i = 1; i < nodes.length; i++) {
    const parent = nodes[Math.floor(rand() * i)];
    const roll = rand();
    const kind = roll < 0.6 ? kinds[0] : roll < 0.85 ? kinds[1] : kinds[2];
    edges.push({
      a: parent.position,
      b: nodes[i].position,
      color: EDGE_TYPES[kind].color,
      revealOrder: i,
    });
  }

  return { nodes, edges };
}
