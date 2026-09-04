// The three AST edge types, and the one color each is drawn in, everywhere on the site:
// hero graph, legends, results charts, and any finding that references edge types.
export const EDGE_TYPES = {
  structural: {
    key: "structural",
    label: "Parent → Child",
    short: "Structural",
    description: "Every AST parent-child relationship — the tree's spine.",
    color: "#4fd1c5",
  },
  sibling: {
    key: "sibling",
    label: "Sibling",
    short: "Sibling",
    description: "Links between consecutive children of the same AST parent.",
    color: "#f2b44d",
  },
  flow: {
    key: "flow",
    label: "Control-flow",
    short: "Control-flow",
    description: "Links consecutive statements within the same block.",
    color: "#e85d75",
  },
} as const;

export type EdgeTypeKey = keyof typeof EDGE_TYPES;

export const EDGE_TYPE_LIST = Object.values(EDGE_TYPES);
