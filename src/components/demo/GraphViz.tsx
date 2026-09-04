"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import * as d3 from "d3";
import clsx from "clsx";
import type { ASTGraph, GraphNode } from "@/lib/graphTypes";
import { EDGE_TYPES, type EdgeTypeKey } from "@/lib/edgeTypes";
import EdgeLegend from "@/components/EdgeLegend";

// ───────────────────────────────────────────────────────────────────
//  Types
// ───────────────────────────────────────────────────────────────────

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  type: string;
  depth: number;
  order: number;
}

interface SimLink {
  source: string | SimNode;
  target: string | SimNode;
  kind: keyof typeof EDGE_TYPES;
}

type PanelState = "empty" | "loading" | "error" | "graph";

interface HoverTooltip {
  x: number;
  y: number;
  type: string;
  id: string;
}

interface D3GraphHandle {
  updateHighlights: (activeId: string | null) => void;
  cleanup: () => void;
}

// ───────────────────────────────────────────────────────────────────
//  Container Dimensions Hook (ResizeObserver)
// ───────────────────────────────────────────────────────────────────

function useContainerDimensions(
  ref: React.RefObject<HTMLDivElement | null>,
  defaultHeight = 360,
) {
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 0,
    height: defaultHeight,
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      const w = Math.round(rect.width);
      const h = Math.round(rect.height) || defaultHeight;
      if (w > 0 && h > 0) {
        setDimensions((prev) =>
          prev.width === w && prev.height === h ? prev : { width: w, height: h },
        );
      }
    };

    measure();

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const w = Math.round(width);
        const h = Math.round(height) || defaultHeight;
        if (w > 0 && h > 0) {
          setDimensions((prev) =>
            prev.width === w && prev.height === h ? prev : { width: w, height: h },
          );
        }
      }
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, defaultHeight]);

  return dimensions;
}

// ───────────────────────────────────────────────────────────────────
//  D3 Visual Highlights (Hover + Selected Persistence)
// ───────────────────────────────────────────────────────────────────

function applyVisualHighlights(
  root: d3.Selection<SVGGElement, unknown, null, undefined>,
  nodes: SimNode[],
  links: SimLink[],
  activeId: string | null,
) {
  if (!activeId) {
    // Reset all nodes to neutral state
    root
      .selectAll<SVGCircleElement, SimNode>("circle.node")
      .transition()
      .duration(160)
      .attr("r", (d) => (d.depth === 0 ? 8 : d.depth === 1 ? 6 : 4.5))
      .attr("fill", (d) => (d.depth === 0 ? "#4fd1c5" : "#e8e6e1"))
      .attr("opacity", 1)
      .attr("stroke", "none")
      .attr("stroke-width", 0);

    // Reset all links to default opacity
    root
      .selectAll<SVGLineElement, SimLink>("line.link")
      .transition()
      .duration(160)
      .attr("opacity", 0.55)
      .attr("stroke-width", 1);
    return;
  }

  // Determine incident links & direct neighbors
  const incidentLinks = new Set<SimLink>();
  const neighborIds = new Set<string>([activeId]);

  for (const l of links) {
    const sId = typeof l.source === "string" ? l.source : (l.source as SimNode).id;
    const tId = typeof l.target === "string" ? l.target : (l.target as SimNode).id;
    if (sId === activeId || tId === activeId) {
      incidentLinks.add(l);
      neighborIds.add(sId);
      neighborIds.add(tId);
    }
  }

  // Update nodes: active node brightened & scaled with subtle ring; neighbors full opacity; others dimmed
  root
    .selectAll<SVGCircleElement, SimNode>("circle.node")
    .transition()
    .duration(160)
    .attr("r", (d) => {
      const baseR = d.depth === 0 ? 8 : d.depth === 1 ? 6 : 4.5;
      return d.id === activeId ? baseR * 1.35 : baseR;
    })
    .attr("fill", (d) => {
      if (d.id === activeId) return "#4fd1c5";
      return d.depth === 0 ? "#4fd1c5" : "#e8e6e1";
    })
    .attr("opacity", (d) => (neighborIds.has(d.id) ? 1 : 0.18))
    .attr("stroke", (d) => (d.id === activeId ? "#ffffff" : "none"))
    .attr("stroke-width", (d) => (d.id === activeId ? 2 : 0));

  // Update links: incident edges highlighted; others dimmed
  root
    .selectAll<SVGLineElement, SimLink>("line.link")
    .transition()
    .duration(160)
    .attr("opacity", (d) => (incidentLinks.has(d) ? 0.95 : 0.08))
    .attr("stroke-width", (d) => (incidentLinks.has(d) ? 2 : 0.8));
}

// ───────────────────────────────────────────────────────────────────
//  D3 force-layout renderer with strict container boundary containment
// ───────────────────────────────────────────────────────────────────

function renderGraph(
  svgEl: SVGSVGElement,
  graph: ASTGraph,
  width: number,
  height: number,
  animate: boolean,
  activeHighlightId: string | null,
  onHover: (tip: HoverTooltip | null) => void,
  onSelect: (nodeId: string | null) => void,
): D3GraphHandle | undefined {
  if (graph.nodes.length === 0 || width <= 0 || height <= 0) return;

  const svg = d3.select(svgEl);
  svg.selectAll("*").remove();

  const PADDING = 24; // 24px inner padding so no node touches or clips container edges
  const nodeCount = graph.nodes.length;

  const nodes: SimNode[] = graph.nodes.map((n, i) => ({ ...n, order: i }));
  const links: SimLink[] = graph.edges.map((e) => ({
    source: e.source,
    target: e.target,
    kind: e.kind,
  }));

  // Adaptive simulation parameters based on graph size and canvas area
  const area = width * height;
  const linkDistance = Math.max(
    14,
    Math.min(36, Math.sqrt(area / Math.max(nodeCount * 4, 1))),
  );
  const chargeStrength = nodeCount > 50 ? -30 : nodeCount > 25 ? -50 : -70;
  const collideRadius = nodeCount > 50 ? 8 : 11;

  const simulation = d3
    .forceSimulation<SimNode>(nodes)
    .force(
      "link",
      d3
        .forceLink<SimNode, SimLink>(links)
        .id((d) => d.id)
        .distance(linkDistance)
        .strength(0.55),
    )
    .force("charge", d3.forceManyBody().strength(chargeStrength))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collide", d3.forceCollide(collideRadius))
    .stop();

  // Run simulation ticks and strictly clamp bounds on every tick
  for (let i = 0; i < 280; i++) {
    simulation.tick();
    for (const d of nodes) {
      const r = d.depth === 0 ? 8 : d.depth === 1 ? 6 : 4.5;
      const pad = PADDING + r;
      d.x = Math.max(pad, Math.min(width - pad, d.x ?? width / 2));
      d.y = Math.max(pad, Math.min(height - pad, d.y ?? height / 2));
    }
  }

  // Auto-fit guarantee: verify bounding box and normalize/center if dense graph expanded
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const d of nodes) {
    const r = d.depth === 0 ? 8 : d.depth === 1 ? 6 : 4.5;
    minX = Math.min(minX, (d.x ?? 0) - r);
    maxX = Math.max(maxX, (d.x ?? 0) + r);
    minY = Math.min(minY, (d.y ?? 0) - r);
    maxY = Math.max(maxY, (d.y ?? 0) + r);
  }

  const availableW = width - 2 * PADDING;
  const availableH = height - 2 * PADDING;
  const graphW = maxX - minX;
  const graphH = maxY - minY;

  if (graphW > availableW || graphH > availableH) {
    const scale =
      Math.min(availableW / (graphW || 1), availableH / (graphH || 1)) * 0.95;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const targetCx = width / 2;
    const targetCy = height / 2;
    for (const d of nodes) {
      d.x = targetCx + ((d.x ?? targetCx) - cx) * scale;
      d.y = targetCy + ((d.y ?? targetCy) - cy) * scale;
    }
  }

  // Final containment clamp pass
  for (const d of nodes) {
    const r = d.depth === 0 ? 8 : d.depth === 1 ? 6 : 4.5;
    d.x = Math.max(PADDING + r, Math.min(width - PADDING - r, d.x ?? width / 2));
    d.y = Math.max(PADDING + r, Math.min(height - PADDING - r, d.y ?? height / 2));
  }

  // Set up zoom root & pan/zoom behavior
  const root = svg.append("g").attr("class", "zoom-root");

  // Transparent background rect to catch empty canvas clicks and clear selection
  const bg = root
    .append("rect")
    .attr("x", -width * 2)
    .attr("y", -height * 2)
    .attr("width", width * 5)
    .attr("height", height * 5)
    .attr("fill", "transparent")
    .style("cursor", "default");

  bg.on("click", (event: MouseEvent) => {
    if (event.defaultPrevented) return;
    onSelect(null);
  });

  const zoom = d3
    .zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.5, 3])
    .on("zoom", (event) => {
      root.attr("transform", event.transform.toString());
    });
  svg.call(zoom);

  // Render edges
  const linkSel = root
    .append("g")
    .attr("class", "links")
    .selectAll("line")
    .data(links)
    .join("line")
    .attr("class", "link")
    .attr("x1", (d) => (d.source as SimNode).x ?? 0)
    .attr("y1", (d) => (d.source as SimNode).y ?? 0)
    .attr("x2", (d) => (d.target as SimNode).x ?? 0)
    .attr("y2", (d) => (d.target as SimNode).y ?? 0)
    .attr("stroke", (d) => EDGE_TYPES[d.kind].color)
    .attr("stroke-width", 1)
    .attr("opacity", 0);

  // Render nodes
  const nodeSel = root
    .append("g")
    .attr("class", "nodes")
    .selectAll("circle")
    .data(nodes)
    .join("circle")
    .attr("class", "node")
    .attr("cx", (d) => d.x ?? 0)
    .attr("cy", (d) => d.y ?? 0)
    .attr("r", (d) => (d.depth === 0 ? 8 : d.depth === 1 ? 6 : 4.5))
    .attr("fill", (d) => (d.depth === 0 ? "#4fd1c5" : "#e8e6e1"))
    .attr("opacity", 0)
    .style("cursor", "pointer")
    .on("mouseenter", (_event, d) => {
      onHover({
        x: d.x ?? 0,
        y: d.y ?? 0,
        type: d.type,
        id: d.id,
      });
    })
    .on("mouseleave", () => onHover(null))
    .on("click", (event: MouseEvent, d) => {
      if (event.defaultPrevented) return;
      event.stopPropagation();
      onSelect(d.id);
    });

  // Entrance animation if requested
  const stagger = animate ? Math.min(20, 800 / nodes.length) : 0;

  linkSel
    .transition()
    .delay((d) => {
      const s = d.source as SimNode;
      const t = d.target as SimNode;
      return Math.max(s.order, t.order) * stagger + 30;
    })
    .duration(240)
    .attr("opacity", 0.55);

  nodeSel
    .transition()
    .delay((d) => d.order * stagger)
    .duration(220)
    .attr("opacity", 1)
    .on("end", (d) => {
      // Re-apply active highlight if a node was already selected when rendering finished
      if (d.order === nodes.length - 1 && activeHighlightId) {
        applyVisualHighlights(root, nodes, links, activeHighlightId);
      }
    });

  // Apply initial highlight if already present
  if (!animate && activeHighlightId) {
    applyVisualHighlights(root, nodes, links, activeHighlightId);
  }

  return {
    updateHighlights: (activeId: string | null) => {
      applyVisualHighlights(root, nodes, links, activeId);
    },
    cleanup: () => simulation.stop(),
  };
}

// ───────────────────────────────────────────────────────────────────
//  Interactive D3 SVG component
// ───────────────────────────────────────────────────────────────────

function GraphSVG({
  graph,
  width,
  height,
  animate,
  selectedNodeId,
  onSelectNode,
}: {
  graph: ASTGraph;
  width: number;
  height: number;
  animate: boolean;
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const handleRef = useRef<D3GraphHandle | null>(null);
  const [hoverTip, setHoverTip] = useState<HoverTooltip | null>(null);

  // Active highlighted node: hovering temporarily overrides or previews, falling back to selection
  const activeHighlightId = hoverTip ? hoverTip.id : selectedNodeId;

  // Render graph simulation when graph or dimensions change
  useEffect(() => {
    if (!svgRef.current || width <= 0 || height <= 0) return;

    const handle = renderGraph(
      svgRef.current,
      graph,
      width,
      height,
      animate,
      activeHighlightId,
      setHoverTip,
      (clickedId) => {
        if (!clickedId) {
          onSelectNode(null);
        } else {
          onSelectNode(clickedId === selectedNodeId ? null : clickedId);
        }
      },
    );

    handleRef.current = handle ?? null;
    return () => {
      handle?.cleanup();
      handleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph, width, height, animate]);

  // Update visual highlights dynamically without re-simulating
  useEffect(() => {
    if (handleRef.current) {
      handleRef.current.updateHighlights(activeHighlightId);
    }
  }, [activeHighlightId]);

  return (
    <div className="relative w-full h-full select-none overflow-hidden">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full touch-none block"
        role="img"
        aria-label="Interactive visualization of the parsed AST graph"
      />

      {/* Hover tooltip: lightweight, shows strictly node type near cursor */}
      {hoverTip && (
        <div
          className="pointer-events-none absolute z-30 font-mono text-xs bg-surface-2/95 border border-border-color px-2.5 py-1 text-text shadow-lg backdrop-blur-sm"
          style={{
            left: Math.min(hoverTip.x + 10, width - 110),
            top: Math.max(hoverTip.y - 28, 8),
          }}
        >
          {hoverTip.type}
        </div>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────
//  Node Detail Panel Content (Used in both inline & fullscreen views)
// ───────────────────────────────────────────────────────────────────

function NodeDetailPanelContent({
  node,
  graph,
  onSelectNode,
  onClose,
}: {
  node: GraphNode;
  graph: ASTGraph;
  onSelectNode: (id: string | null) => void;
  onClose: () => void;
}) {
  // Compute connected edges & neighbors
  const { structuralEdges, siblingEdges, flowEdges, totalEdges, neighbors } =
    useMemo(() => {
      const connected = graph.edges.filter(
        (e) => e.source === node.id || e.target === node.id,
      );

      const structural = connected.filter((e) => e.kind === "structural");
      const sibling = connected.filter((e) => e.kind === "sibling");
      const flow = connected.filter((e) => e.kind === "flow");

      const nodeMap = new Map<string, GraphNode>(
        graph.nodes.map((n) => [n.id, n]),
      );

      const neighborMap = new Map<
        string,
        {
          node: GraphNode;
          relations: { kind: EdgeTypeKey; label: string; color: string }[];
        }
      >();

      for (const e of connected) {
        const isSource = e.source === node.id;
        const neighborId = isSource ? e.target : e.source;
        const neighborNode = nodeMap.get(neighborId);
        if (!neighborNode) continue;

        let label = "";
        if (e.kind === "structural") {
          label = isSource ? "Child" : "Parent";
        } else if (e.kind === "sibling") {
          label = "Sibling";
        } else if (e.kind === "flow") {
          label = isSource ? "Flow Out" : "Flow In";
        }

        const color = EDGE_TYPES[e.kind]?.color ?? "#e8e6e1";

        if (!neighborMap.has(neighborId)) {
          neighborMap.set(neighborId, {
            node: neighborNode,
            relations: [{ kind: e.kind, label, color }],
          });
        } else {
          neighborMap
            .get(neighborId)!
            .relations.push({ kind: e.kind, label, color });
        }
      }

      return {
        structuralEdges: structural,
        siblingEdges: sibling,
        flowEdges: flow,
        totalEdges: connected.length,
        neighbors: Array.from(neighborMap.values()),
      };
    }, [node.id, graph]);

  return (
    <div className="flex flex-col h-full overflow-y-auto p-3.5 space-y-3 font-sans text-xs">
      {/* Top bar: node identity & dismiss button */}
      <div className="flex items-start justify-between gap-2 border-b border-border-color pb-2 shrink-0">
        <div>
          <span className="font-mono text-[9px] uppercase tracking-wider text-text-faint block">
            AST Node Detail
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <h3 className="font-mono text-sm sm:text-base font-semibold text-text">
              {node.type}
            </h3>
            <span className="font-mono text-[10px] text-text-faint px-1.5 py-0.5 rounded bg-surface border border-border-color">
              {node.id}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-text-faint hover:text-text transition-colors p-1 -mr-1"
          aria-label="Close node detail panel"
        >
          <CloseIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* AST Hierarchy stats */}
      <div className="grid grid-cols-2 gap-2 bg-surface/50 border border-border-color p-2 rounded shrink-0">
        <div>
          <span className="text-[9px] font-mono text-text-faint block uppercase">
            Tree Depth
          </span>
          <span className="font-mono text-[11px] text-text font-medium">
            Depth {node.depth} {node.depth === 0 ? "· Root" : ""}
          </span>
        </div>
        <div>
          <span className="text-[9px] font-mono text-text-faint block uppercase">
            Parent Node
          </span>
          {node.parent ? (
            <button
              onClick={() => onSelectNode(node.parent)}
              className="font-mono text-[11px] text-edge-structural hover:underline truncate block text-left"
              title={`Inspect parent ${node.parent}`}
            >
              {node.parent}
            </button>
          ) : (
            <span className="font-mono text-[11px] text-text-faint italic">
              None (Root)
            </span>
          )}
        </div>
      </div>

      {/* Connected Edges breakdown by type */}
      <div className="space-y-1.5 shrink-0">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9px] uppercase tracking-wider text-text-faint">
            Connected Edges
          </span>
          <span className="font-mono text-[10px] text-text-dim">
            {totalEdges} total
          </span>
        </div>

        <div className="space-y-1">
          {/* Structural */}
          <div className="flex items-center justify-between px-2 py-1 rounded bg-surface/40 border border-border-color/80">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: EDGE_TYPES.structural.color }}
              />
              <span className="text-text text-[11px]">Parent → Child</span>
            </div>
            <span className="font-mono text-[11px] text-text-dim font-medium">
              {structuralEdges.length}
            </span>
          </div>

          {/* Sibling */}
          <div className="flex items-center justify-between px-2 py-1 rounded bg-surface/40 border border-border-color/80">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: EDGE_TYPES.sibling.color }}
              />
              <span className="text-text text-[11px]">Sibling</span>
            </div>
            <span className="font-mono text-[11px] text-text-dim font-medium">
              {siblingEdges.length}
            </span>
          </div>

          {/* Control-flow */}
          <div className="flex items-center justify-between px-2 py-1 rounded bg-surface/40 border border-border-color/80">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: EDGE_TYPES.flow.color }}
              />
              <span className="text-text text-[11px]">Control-flow</span>
            </div>
            <span className="font-mono text-[11px] text-text-dim font-medium">
              {flowEdges.length}
            </span>
          </div>
        </div>
      </div>

      {/* Connected Neighbors list with clickable jump */}
      <div className="space-y-1.5 flex-1 min-h-0 flex flex-col">
        <div className="flex items-center justify-between shrink-0">
          <span className="font-mono text-[9px] uppercase tracking-wider text-text-faint">
            Connected Neighbors
          </span>
          <span className="font-mono text-[10px] text-text-dim">
            {neighbors.length} nodes
          </span>
        </div>

        <div className="overflow-y-auto space-y-1 pr-0.5 flex-1 min-h-0">
          {neighbors.length === 0 ? (
            <p className="font-mono text-[11px] text-text-faint py-2 text-center">
              No connected neighbors
            </p>
          ) : (
            neighbors.map(({ node: n, relations }) => (
              <button
                key={n.id}
                onClick={() => onSelectNode(n.id)}
                className="w-full flex items-center justify-between p-1.5 rounded bg-surface/40 border border-border-color/70 hover:border-text-dim hover:bg-surface transition-all text-left group"
                title={`Inspect node ${n.id} (${n.type})`}
              >
                <div className="min-w-0 pr-2">
                  <div className="font-mono text-[11px] text-text group-hover:text-edge-structural transition-colors truncate">
                    {n.type}
                  </div>
                  <div className="font-mono text-[9px] text-text-faint truncate">
                    {n.id} · depth {n.depth}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1 justify-end shrink-0">
                  {relations.map((rel, idx) => (
                    <span
                      key={idx}
                      className="font-mono text-[8px] px-1 py-0.2 rounded border border-current"
                      style={{ color: rel.color }}
                    >
                      {rel.label}
                    </span>
                  ))}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Footer hint */}
      <p className="font-mono text-[9px] text-text-faint pt-1.5 border-t border-border-color shrink-0 text-center">
        Click neighbor to jump · Click canvas to dismiss
      </p>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────
//  State sub-components (empty, loading, error)
// ───────────────────────────────────────────────────────────────────

function EmptyState({ height }: { height: number }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 select-none w-full h-full"
      style={{ minHeight: height }}
    >
      <svg
        viewBox="0 0 120 80"
        className="w-24 h-16 text-border-color"
        aria-hidden
      >
        {[0, 30, 60, 90, 120].map((x) =>
          [0, 20, 40, 60, 80].map((y) => (
            <circle
              key={`${x}-${y}`}
              cx={x}
              cy={y}
              r={1}
              fill="currentColor"
              opacity={0.4}
            />
          )),
        )}
        <circle cx={45} cy={35} r={4} fill="none" stroke="currentColor" strokeWidth={1} opacity={0.25} />
        <circle cx={75} cy={45} r={3} fill="none" stroke="currentColor" strokeWidth={1} opacity={0.25} />
        <line x1={49} y1={37} x2={72} y2={44} stroke="currentColor" strokeWidth={0.7} opacity={0.15} />
      </svg>
      <p className="font-mono text-xs text-text-faint text-center max-w-[28ch] leading-relaxed">
        Paste code and hit Classify to see its graph
      </p>
    </div>
  );
}

function LoadingState({ height }: { height: number }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 select-none w-full h-full"
      style={{ minHeight: height }}
    >
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block w-1.5 h-1.5 rounded-full bg-text-faint"
            style={{
              animation: `graphPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
      <p className="font-mono text-xs text-text-faint">Classifying…</p>
      <style>{`
        @keyframes graphPulse {
          0%, 80%, 100% { opacity: 0.25; transform: scale(1); }
          40% { opacity: 1; transform: scale(1.4); }
        }
      `}</style>
    </div>
  );
}

function ErrorState({ message, height }: { message: string; height: number }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 select-none w-full h-full"
      style={{ minHeight: height }}
    >
      <svg viewBox="0 0 24 24" className="w-6 h-6 text-edge-flow" aria-hidden>
        <circle cx={12} cy={12} r={10} fill="none" stroke="currentColor" strokeWidth={1.5} opacity={0.5} />
        <line x1={8} y1={8} x2={16} y2={16} stroke="currentColor" strokeWidth={1.5} />
        <line x1={16} y1={8} x2={8} y2={16} stroke="currentColor" strokeWidth={1.5} />
      </svg>
      <p className="font-mono text-xs text-edge-flow text-center max-w-[32ch] leading-relaxed">
        {message}
      </p>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────
//  Icons
// ───────────────────────────────────────────────────────────────────

function ExpandIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={clsx("w-3.5 h-3.5", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="10,2 14,2 14,6" />
      <polyline points="6,14 2,14 2,10" />
      <line x1={14} y1={2} x2={9} y2={7} />
      <line x1={2} y1={14} x2={7} y2={9} />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={clsx("w-4 h-4", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
    >
      <line x1={3} y1={3} x2={13} y2={13} />
      <line x1={13} y1={3} x2={3} y2={13} />
    </svg>
  );
}

// ───────────────────────────────────────────────────────────────────
//  Fullscreen overlay modal (with dedicated sidebar column for node detail)
// ───────────────────────────────────────────────────────────────────

const OVERLAY_TRANSITION = {
  duration: 0.3,
  ease: [0.22, 1, 0.36, 1] as const,
};

const OVERLAY_REDUCED = {
  duration: 0,
};

function FullscreenOverlay({
  state,
  graph,
  error,
  selectedNodeId,
  onSelectNode,
  onClose,
}: {
  state: PanelState;
  graph: ASTGraph | null;
  error: string | null;
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  onClose: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement>(null);
  const graphContainerRef = useRef<HTMLDivElement>(null);
  const transition = reducedMotion ? OVERLAY_REDUCED : OVERLAY_TRANSITION;

  // Measure actual canvas area inside the modal
  const dims = useContainerDimensions(graphContainerRef, 600);

  // Focus close button on mount
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  // Escape key: dismiss node detail first, then dismiss modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedNodeId) {
          onSelectNode(null);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [selectedNodeId, onSelectNode, onClose]);

  const selectedNode = useMemo(
    () => (graph ? graph.nodes.find((n) => n.id === selectedNodeId) ?? null : null),
    [graph, selectedNodeId],
  );

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={transition}
        onClick={onClose}
        aria-hidden
      />

      {/* Modal Dialog */}
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 pointer-events-none"
        initial={reducedMotion ? {} : { opacity: 0, scale: 0.94 }}
        animate={reducedMotion ? {} : { opacity: 1, scale: 1 }}
        exit={reducedMotion ? {} : { opacity: 0, scale: 0.94 }}
        transition={transition}
      >
        <div
          className="relative w-full max-w-[96vw] h-[90vh] max-h-[92vh] bg-surface border border-border-color pointer-events-auto flex flex-col shadow-2xl overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Expanded graph view"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-color shrink-0 bg-surface">
            <div className="flex items-center gap-4">
              <p className="font-mono text-xs text-text-faint">Graph (Fullscreen)</p>
              <EdgeLegend dense />
            </div>
            <button
              ref={closeRef}
              onClick={onClose}
              className="text-text-faint hover:text-text transition-colors p-1"
              aria-label="Close expanded view"
            >
              <CloseIcon />
            </button>
          </div>

          {/* Main Body: Graph Canvas + Animated Sidebar Column */}
          <div className="flex-1 min-h-0 flex flex-row overflow-hidden relative">
            {/* Graph area */}
            <div
              ref={graphContainerRef}
              className="flex-1 min-w-0 h-full relative overflow-hidden"
            >
              {state === "empty" && <EmptyState height={dims.height} />}
              {state === "loading" && <LoadingState height={dims.height} />}
              {state === "error" && (
                <ErrorState
                  message={error ?? "Classification failed. Try again."}
                  height={dims.height}
                />
              )}
              {state === "graph" && graph && dims.width > 0 && (
                <GraphSVG
                  graph={graph}
                  width={dims.width}
                  height={dims.height}
                  animate={true}
                  selectedNodeId={selectedNodeId}
                  onSelectNode={onSelectNode}
                />
              )}
            </div>

            {/* Dedicated Sidebar Column alongside graph in fullscreen view */}
            <AnimatePresence>
              {selectedNode && graph && (
                <motion.aside
                  key="fs-node-detail-sidebar"
                  initial={reducedMotion ? false : { width: 0, opacity: 0 }}
                  animate={reducedMotion ? {} : { width: 340, opacity: 1 }}
                  exit={reducedMotion ? {} : { width: 0, opacity: 0 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  className="border-l border-border-color bg-surface-2/70 shrink-0 h-full overflow-hidden flex flex-col"
                  aria-label="Node Details"
                >
                  <div className="w-[340px] h-full flex flex-col">
                    <NodeDetailPanelContent
                      node={selectedNode}
                      graph={graph}
                      onSelectNode={onSelectNode}
                      onClose={() => onSelectNode(null)}
                    />
                  </div>
                </motion.aside>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ───────────────────────────────────────────────────────────────────
//  Main exported component
// ───────────────────────────────────────────────────────────────────

export default function GraphPanel({
  graph,
  loading,
  error,
  height = 360,
}: {
  graph: ASTGraph | null;
  loading: boolean;
  error: string | null;
  height?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const expandBtnRef = useRef<HTMLButtonElement>(null);
  const inlineContainerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  // Dynamic dimensions of the inline container via ResizeObserver
  const inlineDims = useContainerDimensions(inlineContainerRef, height);

  // Clear selection if the graph is cleared or changes completely
  useEffect(() => {
    if (!graph) {
      setSelectedNodeId(null);
    } else if (selectedNodeId) {
      const exists = graph.nodes.some((n) => n.id === selectedNodeId);
      if (!exists) setSelectedNodeId(null);
    }
  }, [graph, selectedNodeId]);

  // Determine panel state
  const state: PanelState = loading
    ? "loading"
    : error
      ? "error"
      : graph
        ? "graph"
        : "empty";

  // Return focus when closing fullscreen
  const handleCloseFullscreen = useCallback(() => {
    setExpanded(false);
    requestAnimationFrame(() => expandBtnRef.current?.focus());
  }, []);

  const selectedNode = useMemo(
    () => (graph ? graph.nodes.find((n) => n.id === selectedNodeId) ?? null : null),
    [graph, selectedNodeId],
  );

  return (
    <div className="border border-border-color p-3 bg-surface/30">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-4">
          <p className="font-mono text-xs text-text-faint">Graph</p>
          <EdgeLegend dense />
        </div>
        <button
          ref={expandBtnRef}
          onClick={() => setExpanded(true)}
          className="text-text-faint hover:text-text transition-colors p-1"
          aria-label="Expand graph to fullscreen"
          title="Expand"
        >
          <ExpandIcon />
        </button>
      </div>

      {/* Inline panel container: strictly sized and overflow-hidden */}
      <div
        ref={inlineContainerRef}
        className="relative w-full overflow-hidden border border-border-color/60 bg-surface/40"
        style={{ minHeight: height, height }}
      >
        {state === "empty" && <EmptyState height={height} />}
        {state === "loading" && <LoadingState height={height} />}
        {state === "error" && (
          <ErrorState
            message={error ?? "Classification failed. Try again."}
            height={height}
          />
        )}
        {state === "graph" && graph && inlineDims.width > 0 && (
          <GraphSVG
            graph={graph}
            width={inlineDims.width}
            height={inlineDims.height}
            animate={true}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
          />
        )}

        {/* Inline Node Detail Panel: slides in as an overlay from the right */}
        <AnimatePresence>
          {selectedNode && graph && (
            <motion.aside
              key="inline-node-detail-panel"
              initial={reducedMotion ? false : { x: "100%", opacity: 0 }}
              animate={reducedMotion ? {} : { x: 0, opacity: 1 }}
              exit={reducedMotion ? {} : { x: "100%", opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="absolute right-0 top-0 bottom-0 w-72 sm:w-80 bg-surface/95 backdrop-blur-md border-l border-border-color z-20 flex flex-col shadow-2xl"
              aria-label="Node Details"
            >
              <NodeDetailPanelContent
                node={selectedNode}
                graph={graph}
                onSelectNode={setSelectedNodeId}
                onClose={() => setSelectedNodeId(null)}
              />
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* Fullscreen overlay */}
      <AnimatePresence>
        {expanded && (
          <FullscreenOverlay
            key="graph-fullscreen"
            state={state}
            graph={graph}
            error={error}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
            onClose={handleCloseFullscreen}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
