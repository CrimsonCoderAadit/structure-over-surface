import { NextResponse } from "next/server";

export interface ClassifyResponse {
  prediction: "human" | "machine";
  confidence: number;
  graph: {
    nodes: { id: string; type: string; depth: number; parent: string | null }[];
    edges: { source: string; target: string; kind: "structural" | "sibling" | "flow" }[];
  };
}

const BACKEND_URL = process.env.BACKEND_API_URL ?? "http://localhost:8000";

/**
 * Proxies the classify request to the real FastAPI backend.
 *
 * Expected backend contract:
 *   POST  {BACKEND_URL}/classify
 *   Body: { "code": "<python source>" }
 *   Resp: { prediction, confidence, graph: { nodes, edges } }
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const source: string = typeof body?.code === "string" ? body.code : "";

  if (!source.trim()) {
    return NextResponse.json({ error: "No source code provided." }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${BACKEND_URL}/classify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: source }),
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "Backend error");
      return NextResponse.json(
        { error: detail },
        { status: upstream.status },
      );
    }

    const data: ClassifyResponse = await upstream.json();

    // Pass through with the exact shape the frontend expects.
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to reach classification backend";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
