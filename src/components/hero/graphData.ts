import { buildMockGraph } from "@/lib/mockAst";
import { layoutGraph } from "@/lib/graphLayout";
import { EDGE_TYPES } from "@/lib/edgeTypes";
import type { EdgeTypeKey } from "@/lib/edgeTypes";

// A denser snippet than the demo's default — this graph is the site's single
// most important visual, so it should read as a real, richly-branching tree,
// not a thin stick figure of one small function.
const HERO_SNIPPET = `def classify_batch(items, threshold, seen):
    results = []
    total = 0
    for item in items:
        if item is None:
            continue
        if item.id in seen:
            continue
        seen.add(item.id)
        score = 0
        for feature in item.features:
            if feature.weight > threshold:
                score += feature.weight * 2
            elif feature.weight > 0:
                score += feature.weight
            else:
                score -= 1
        if score > threshold:
            label = "machine"
        elif score > 0:
            label = "uncertain"
        else:
            label = "human"
        results.append((item.id, label, score))
        total += 1
        if total % 50 == 0:
            flush(results)
    while results and results[-1][2] < 0:
        results.pop()
    for entry in results:
        if entry[1] == "uncertain":
            recheck(entry)
        else:
            commit(entry)
    return results, total`;

export const GRAPH = buildMockGraph(HERO_SNIPPET);
export const LAID_OUT = layoutGraph(GRAPH);
export const POS_BY_ID = new Map(LAID_OUT.map((n) => [n.id, n]));
export const ORDER_BY_ID = new Map(LAID_OUT.map((n) => [n.id, n.order]));

export const EDGES_RESOLVED = GRAPH.edges
  .map((e) => {
    const a = POS_BY_ID.get(e.source);
    const b = POS_BY_ID.get(e.target);
    if (!a || !b) return null;
    return {
      a: a.position,
      b: b.position,
      kind: e.kind as EdgeTypeKey,
      color: EDGE_TYPES[e.kind as EdgeTypeKey].color,
      revealOrder: Math.max(a.order, b.order),
    };
  })
  .filter((e): e is NonNullable<typeof e> => e !== null);

export const STAGGER = 0.05;
export const HOLD_SECONDS = 2.6;
export const BUILD_SECONDS = LAID_OUT.length * STAGGER;
export const CYCLE_SECONDS = BUILD_SECONDS + HOLD_SECONDS + 1.6;
