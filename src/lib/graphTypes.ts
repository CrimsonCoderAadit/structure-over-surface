import type { EdgeTypeKey } from "./edgeTypes";

export interface GraphNode {
  id: string;
  type: string;
  depth: number;
  parent: string | null;
}

export interface GraphEdge {
  source: string;
  target: string;
  kind: EdgeTypeKey;
}

export interface ASTGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
