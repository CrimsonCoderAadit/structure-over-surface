"use client";

import { useState } from "react";
import CodeInput from "@/components/demo/CodeInput";
import GraphPanel from "@/components/demo/GraphViz";
import ResultPanel from "@/components/demo/ResultPanel";
import { CANONICAL_SNIPPET } from "@/lib/mockAst";
import type { ClassifyResponse } from "@/app/api/classify/route";

export default function DemoPage() {
  const [code, setCode] = useState(CANONICAL_SNIPPET);
  const [result, setResult] = useState<ClassifyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) throw new Error("Classification failed.");
      const data: ClassifyResponse = await res.json();
      setResult(data);
    } catch {
      setError("Something went wrong parsing that snippet. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-5 sm:px-8 py-20 sm:py-24">
      <h1 className="font-display text-4xl sm:text-5xl">Demo</h1>
      <p className="measure mt-6 text-text-dim leading-relaxed">
        Paste or upload a Python function. The panel on the right shows the AST graph as
        it&apos;s constructed, colored by edge type; the result below shows what the
        classifier makes of it.
      </p>

      <div className="mt-12 grid lg:grid-cols-2 gap-8">
        <CodeInput value={code} onChange={setCode} onSubmit={handleSubmit} loading={loading} />

        <div className="flex flex-col gap-6">
          <GraphPanel
            graph={result?.graph ?? null}
            loading={loading}
            error={error}
            height={360}
          />

          <ResultPanel result={result} />
        </div>
      </div>
    </div>
  );
}
