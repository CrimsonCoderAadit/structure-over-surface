import { NextResponse } from "next/server";

export interface ClassifyResponse {
  prediction: "human" | "machine";
  confidence: number;
  graph: {
    nodes: { id: string; type: string; depth: number; parent: string | null }[];
    edges: { source: string; target: string; kind: "structural" | "sibling" | "flow" }[];
  };
}

// The backend's structured error shape — every failure mode (bad input,
// model not loaded, an unexpected crash) comes back tagged with a code so
// the frontend can react differently to "you gave me non-Python" versus
// "something on the server actually broke".
export interface ClassifyErrorResponse {
  error: "invalid_python" | "no_input" | "model_not_loaded" | "server_error" | "unreachable" | string;
  detail: string;
}

const BACKEND_URL = process.env.BACKEND_API_URL ?? "http://localhost:8000";

/**
 * Proxies the classify request to the real FastAPI backend.
 *
 * Expected backend contract:
 *   POST  {BACKEND_URL}/classify
 *   Body: { "code": "<python source>" }
 *   Resp: { prediction, confidence, graph: { nodes, edges } }
 *   Error: { error: "<code>", detail: "<message>" } with a matching status
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const source: string = typeof body?.code === "string" ? body.code : "";

  if (!source.trim()) {
    const error: ClassifyErrorResponse = { error: "no_input", detail: "No source code provided." };
    return NextResponse.json(error, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${BACKEND_URL}/classify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: source }),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to reach classification backend";
    const error: ClassifyErrorResponse = { error: "unreachable", detail: message };
    return NextResponse.json(error, { status: 502 });
  }

  if (!upstream.ok) {
    const parsed = await upstream
      .json()
      .catch(() => null) as Partial<ClassifyErrorResponse> | null;

    const error: ClassifyErrorResponse =
      parsed && typeof parsed.error === "string" && typeof parsed.detail === "string"
        ? { error: parsed.error, detail: parsed.detail }
        : { error: "server_error", detail: `Backend returned ${upstream.status}.` };

    return NextResponse.json(error, { status: upstream.status });
  }

  let data: ClassifyResponse;
  try {
    data = await upstream.json();
  } catch {
    const error: ClassifyErrorResponse = { error: "server_error", detail: "Backend returned an unreadable response." };
    return NextResponse.json(error, { status: 502 });
  }

  // Pass through with the exact shape the frontend expects.
  return NextResponse.json(data);
}
