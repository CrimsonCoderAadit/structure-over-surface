import { buildMockGraph } from "@/lib/mockAst";
import { layoutGraph } from "@/lib/graphLayout";
import type { LaidOutNode } from "@/lib/graphLayout";
import { EDGE_TYPES } from "@/lib/edgeTypes";
import type { EdgeTypeKey } from "@/lib/edgeTypes";

// Five snippets of comparable length and nesting depth, so each graph in the
// hero's rotation reads as the same kind of shape, just a different tree.
// This is the site's single most important visual: it should always look like
// a real, richly-branching structure, never a thin stick figure.
const HERO_SNIPPETS = [
  `def classify_batch(items, threshold, seen):
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
    return results, total`,

  `class GraphCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.store = {}
        self.order = []

    def get(self, key):
        if key not in self.store:
            return None
        self.order.remove(key)
        self.order.append(key)
        return self.store[key]

    def put(self, key, value):
        if key in self.store:
            self.order.remove(key)
        elif len(self.store) >= self.capacity:
            oldest = self.order.pop(0)
            del self.store[oldest]
        self.store[key] = value
        self.order.append(key)

    def evict_stale(self, now, ttl):
        stale = []
        for key, entry in self.store.items():
            if entry.timestamp is None:
                continue
            if now - entry.timestamp > ttl:
                stale.append(key)
        for key in stale:
            del self.store[key]
            self.order.remove(key)
        return len(stale)`,

  `def merge_intervals(intervals, padding=0):
    if not intervals:
        return []
    intervals = sorted(intervals, key=lambda x: x[0])
    merged = [intervals[0]]
    for start, end in intervals[1:]:
        last = merged[-1]
        if start <= last[1] + padding:
            if end > last[1]:
                merged[-1] = (last[0], end)
        else:
            merged.append((start, end))
    gaps = []
    for i in range(len(merged) - 1):
        gap = merged[i + 1][0] - merged[i][1]
        if gap > 0:
            gaps.append(gap)
        elif gap == 0:
            continue
        else:
            raise ValueError("overlap after merge")
    total_span = 0
    for start, end in merged:
        total_span += end - start
        if end - start > 1000:
            log("suspiciously long interval", start, end)
    return merged, gaps, total_span`,

  `def walk_directory(root, extensions, skip_hidden=True):
    matches = []
    stack = [root]
    while stack:
        current = stack.pop()
        try:
            entries = list(current.iterdir())
        except PermissionError:
            continue
        for entry in entries:
            if skip_hidden and entry.name.startswith("."):
                continue
            if entry.is_dir():
                stack.append(entry)
            elif entry.is_file():
                if entry.suffix in extensions:
                    matches.append(entry)
                elif entry.suffix == ".tmp":
                    entry.unlink(missing_ok=True)
        if len(matches) > 5000:
            break
    matches.sort(key=lambda p: p.stat().st_mtime)
    grouped = {}
    for path in matches:
        key = path.suffix
        if key not in grouped:
            grouped[key] = []
        grouped[key].append(path)
    return grouped`,

  `def retry_with_backoff(fn, args, max_attempts=5, base_delay=0.5):
    attempt = 0
    last_error = None
    while attempt < max_attempts:
        try:
            result = fn(*args)
        except TimeoutError as exc:
            last_error = exc
            attempt += 1
            delay = base_delay * (2 ** attempt)
            if delay > 30:
                delay = 30
            sleep(delay)
            continue
        except ValueError as exc:
            last_error = exc
            break
        else:
            if result is None:
                attempt += 1
                continue
            return result
    if last_error is not None:
        raise RuntimeError("all attempts failed") from last_error
    return None`,
];

export interface ResolvedEdge {
  a: [number, number, number];
  b: [number, number, number];
  kind: EdgeTypeKey;
  color: string;
  revealOrder: number;
}

export interface HeroGraphSet {
  laidOut: LaidOutNode[];
  edges: ResolvedEdge[];
  stagger: number;
  buildSeconds: number;
  holdSeconds: number;
  vanishSeconds: number;
  /** Build + hold, before the vanish phase begins. */
  buildHoldSeconds: number;
  /** Full time this graph occupies the scene, build through vanish. */
  cycleSeconds: number;
}

const STAGGER = 0.05;
const HOLD_SECONDS = 2.6;

function buildHeroGraph(snippet: string): HeroGraphSet {
  const graph = buildMockGraph(snippet);
  const laidOut = layoutGraph(graph);
  const posById = new Map(laidOut.map((n) => [n.id, n]));

  const edges = graph.edges
    .map((e) => {
      const a = posById.get(e.source);
      const b = posById.get(e.target);
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

  const buildSeconds = laidOut.length * STAGGER;
  const buildHoldSeconds = buildSeconds + HOLD_SECONDS;
  // Vanish mirrors the build: same stagger, same duration, reverse order.
  // The last node to appear is the first to disappear.
  const vanishSeconds = buildSeconds;

  return {
    laidOut,
    edges,
    stagger: STAGGER,
    buildSeconds,
    holdSeconds: HOLD_SECONDS,
    vanishSeconds,
    buildHoldSeconds,
    cycleSeconds: buildHoldSeconds + vanishSeconds,
  };
}

// Precomputed once at module load: same deterministic layout every render,
// server and client, so there's no hydration mismatch.
export const HERO_GRAPH_SETS: HeroGraphSet[] = HERO_SNIPPETS.map(buildHeroGraph);

// Kept for the static (SSR) fallback, which only ever shows one frame.
export const LAID_OUT = HERO_GRAPH_SETS[0].laidOut;
export const EDGES_RESOLVED = HERO_GRAPH_SETS[0].edges;
