"""FastAPI backend for the Structure-over-Surface demo.

Accepts Python source code, parses it into a structural AST graph, runs the
trained ASTGNN classifier, and returns prediction + confidence + the graph
for the frontend to visualize.

Start with:
    uvicorn api.main:app --reload --port 8000
"""
import ast
import json
import os
import sys
import textwrap
from pathlib import Path

import torch
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# --- path setup: make src/ importable ---
PROJECT_ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = PROJECT_ROOT / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from model import ASTGNN  # noqa: E402

# ---------------------------------------------------------------------------
# Structured errors
#
# Every failure the frontend needs to branch on (invalid input vs. a real
# server/model problem vs. the backend being unreachable) comes back as
# {"error": "<code>", "detail": "<message>"} with an appropriate status, so
# the Next.js proxy and the demo page can tell them apart instead of
# collapsing everything into one generic message.
# ---------------------------------------------------------------------------
class ClassifyError(Exception):
    def __init__(self, status_code: int, error: str, detail: str):
        self.status_code = status_code
        self.error = error
        self.detail = detail


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
VOCAB_PATH = PROJECT_ROOT / "data" / "graphs" / "vocab.json"
CHECKPOINT_PATH = PROJECT_ROOT / "models" / "gnn_gin_best.pt"

# The three edge types the frontend knows about. The backend's build_graphs
# also emits "dataflow" but the frontend EdgeTypeKey is only
# structural | sibling | flow, so we map child -> structural and skip dataflow.
BACKEND_TO_FRONTEND_EDGE_KIND = {
    "child": "structural",
    "sibling": "sibling",
    "flow": "flow",
}

# ---------------------------------------------------------------------------
# Globals loaded once at startup
# ---------------------------------------------------------------------------
vocab: dict[str, int] = {}
model: ASTGNN | None = None
device = torch.device("cpu")


# ---------------------------------------------------------------------------
# AST graph builder (mirrors src/build_graphs.py but produces the frontend shape)
# ---------------------------------------------------------------------------
def parse_source(code: str) -> ast.AST | None:
    """Parse source, tolerating leading indentation."""
    for candidate in (code, textwrap.dedent(code)):
        try:
            return ast.parse(candidate)
        except (SyntaxError, ValueError):
            continue
    return None


def build_graph_for_api(tree: ast.AST) -> dict:
    """Walk the AST and emit nodes + edges in the shape the frontend expects.

    Returns:
        {
          "nodes": [{ id, type, depth, parent }],
          "edges": [{ source, target, kind }],
          "node_type_ids": [int]   # vocab indices for model inference
        }
    """
    nodes: list[dict] = []
    edges: list[dict] = []
    node_type_ids: list[int] = []
    index: dict[int, int] = {}  # id(ast node) -> sequential index

    def visit(node: ast.AST, depth: int, parent_id: str | None) -> int:
        idx = len(nodes)
        index[id(node)] = idx
        type_name = type(node).__name__
        node_id = f"{type_name}_{idx}"
        nodes.append({
            "id": node_id,
            "type": type_name,
            "depth": depth,
            "parent": parent_id,
        })
        node_type_ids.append(vocab.get(type_name, 0))

        children = list(ast.iter_child_nodes(node))
        child_indices = [visit(c, depth + 1, node_id) for c in children]

        # (a) parent-child -> "structural"
        for ci in child_indices:
            edges.append({
                "source": node_id,
                "target": nodes[ci]["id"],
                "kind": "structural",
            })
        # (b) sibling
        for a, b in zip(child_indices, child_indices[1:]):
            edges.append({
                "source": nodes[a]["id"],
                "target": nodes[b]["id"],
                "kind": "sibling",
            })
        # (c) control-flow
        for _field, value in ast.iter_fields(node):
            if isinstance(value, list):
                stmts = [v for v in value if isinstance(v, ast.stmt)]
                for a, b in zip(stmts, stmts[1:]):
                    edges.append({
                        "source": nodes[index[id(a)]]["id"],
                        "target": nodes[index[id(b)]]["id"],
                        "kind": "flow",
                    })
        return idx

    visit(tree, 0, None)
    return {"nodes": nodes, "edges": edges, "node_type_ids": node_type_ids}


# ---------------------------------------------------------------------------
# Model inference
# ---------------------------------------------------------------------------
def classify_code(source: str) -> dict:
    """Parse, graph, and classify a Python snippet."""
    tree = parse_source(source)
    if tree is None:
        raise ClassifyError(
            status_code=400,
            error="invalid_python",
            detail="Could not parse the submitted code as Python.",
        )

    graph = build_graph_for_api(tree)

    if model is None:
        raise ClassifyError(status_code=503, error="model_not_loaded", detail="Model not loaded.")

    x = torch.tensor(graph["node_type_ids"], dtype=torch.long, device=device)
    # Build edge_index from the graph edges. We need numeric indices, which are
    # the position of each node id in the nodes list.
    id_to_idx = {n["id"]: i for i, n in enumerate(graph["nodes"])}
    src_list, dst_list = [], []
    for e in graph["edges"]:
        src_list.append(id_to_idx[e["source"]])
        dst_list.append(id_to_idx[e["target"]])
    edge_index = (
        torch.tensor([src_list, dst_list], dtype=torch.long, device=device)
        if src_list
        else torch.empty((2, 0), dtype=torch.long, device=device)
    )
    batch = torch.zeros(x.size(0), dtype=torch.long, device=device)

    with torch.no_grad():
        logits = model(x, edge_index, batch)
        probs = logits.softmax(dim=1).squeeze(0)  # [human_prob, machine_prob]

    machine_prob = probs[1].item()
    prediction = "machine" if machine_prob >= 0.5 else "human"
    confidence = machine_prob if prediction == "machine" else 1.0 - machine_prob

    return {
        "prediction": prediction,
        "confidence": round(confidence, 4),
        "graph": {
            "nodes": graph["nodes"],
            "edges": graph["edges"],
        },
    }


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(title="Structure-over-Surface API", version="0.1.0")

# CORS_ORIGINS is a comma-separated list of allowed origins (e.g. the deployed
# Vercel URL). Falls back to localhost for local development.
_cors_origins_env = os.environ.get("CORS_ORIGINS", "http://localhost:3000")
CORS_ORIGINS = [origin.strip() for origin in _cors_origins_env.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ClassifyRequest(BaseModel):
    code: str


@app.on_event("startup")
def load_model():
    global vocab, model, device

    # Load vocabulary
    with open(VOCAB_PATH) as f:
        vocab.update(json.load(f))
    print(f"[startup] vocab loaded: {len(vocab)} node types")

    # Device selection
    if torch.backends.mps.is_available():
        device_name = "mps"
    elif torch.cuda.is_available():
        device_name = "cuda"
    else:
        device_name = "cpu"
    device = torch.device(device_name)

    # Load checkpoint
    ckpt = torch.load(CHECKPOINT_PATH, map_location=device, weights_only=True)
    args = ckpt.get("args", {})
    vocab_size = ckpt.get("vocab_size", len(vocab))

    model = ASTGNN(
        vocab_size=vocab_size,
        hidden=args.get("hidden", 128),
        num_layers=args.get("layers", 3),
        conv=args.get("conv", "gin"),
    ).to(device)
    model.load_state_dict(ckpt["state_dict"])
    model.eval()
    print(f"[startup] model loaded from {CHECKPOINT_PATH} on {device}")


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": model is not None}


@app.exception_handler(ClassifyError)
def handle_classify_error(_request: Request, exc: ClassifyError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"error": exc.error, "detail": exc.detail})


@app.exception_handler(Exception)
def handle_unexpected_error(_request: Request, exc: Exception) -> JSONResponse:
    print(f"[error] unhandled exception: {exc!r}")
    return JSONResponse(
        status_code=500,
        content={"error": "server_error", "detail": "An unexpected server error occurred."},
    )


@app.post("/classify")
def classify(req: ClassifyRequest):
    if not req.code.strip():
        raise ClassifyError(status_code=400, error="no_input", detail="No source code provided.")
    return classify_code(req.code)
