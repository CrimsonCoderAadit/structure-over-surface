import type { ASTGraph, GraphEdge, GraphNode } from "./graphTypes";

// A deliberately simple line-based heuristic parser — NOT a real Python AST.
// It exists to produce a graph with the right shape (nesting, block structure,
// three edge kinds) for visualization on the marketing site and the demo mock.
// The real pipeline uses Python's `ast` module — see /methodology.

const BLOCK_KEYWORDS: Record<string, string> = {
  def: "FunctionDef",
  class: "ClassDef",
  if: "If",
  elif: "If",
  else: "If",
  for: "For",
  while: "While",
  try: "Try",
  except: "ExceptHandler",
  with: "With",
};

function classify(line: string): string {
  const t = line.trim();
  const firstWord = t.split(/[\s(:]/)[0];
  if (BLOCK_KEYWORDS[firstWord]) return BLOCK_KEYWORDS[firstWord];
  if (t.startsWith("return")) return "Return";
  if (t.startsWith("import") || t.startsWith("from")) return "Import";
  if (t.includes("=") && !t.includes("==")) return "Assign";
  if (/\w+\(.*\)/.test(t)) return "Call";
  if (t.startsWith("#")) return "Comment";
  return "Expr";
}

function indentOf(line: string): number {
  const m = line.match(/^[\t ]*/);
  if (!m) return 0;
  return m[0].replace(/\t/g, "    ").length;
}

export function buildMockGraph(source: string): ASTGraph {
  const nodes: GraphNode[] = [{ id: "n0", type: "Module", depth: 0, parent: null }];
  const edges: GraphEdge[] = [];
  let counter = 1;

  const lines = source.split("\n").filter((l) => l.trim().length > 0);
  const stack: { indent: number; parentId: string; depth: number; lastChild: string | null }[] = [
    { indent: -1, parentId: "n0", depth: 0, lastChild: null },
  ];

  for (const rawLine of lines) {
    const indent = indentOf(rawLine);
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }
    const frame = stack[stack.length - 1];
    const id = `n${counter++}`;
    const type = classify(rawLine);
    const depth = frame.depth + 1;
    nodes.push({ id, type, depth, parent: frame.parentId });
    edges.push({ source: frame.parentId, target: id, kind: "structural" });

    if (frame.lastChild) {
      edges.push({ source: frame.lastChild, target: id, kind: "sibling" });
      edges.push({ source: frame.lastChild, target: id, kind: "flow" });
    }
    frame.lastChild = id;

    if (rawLine.trim().endsWith(":")) {
      stack.push({ indent, parentId: id, depth, lastChild: null });
    }

    if (nodes.length > 140) break;
  }

  return { nodes, edges };
}

export const CANONICAL_SNIPPET = `def is_palindrome(s):
    s = s.lower()
    left = 0
    right = len(s) - 1
    while left < right:
        if s[left] != s[right]:
            return False
        left += 1
        right -= 1
    return True`;
