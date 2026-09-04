"use client";

import { motion } from "framer-motion";
import { VERDICT_COLORS } from "@/lib/verdictColors";
import type { ClassifyResponse } from "@/app/api/classify/route";

export default function ResultPanel({ result }: { result: ClassifyResponse | null }) {
  if (!result) {
    return (
      <div className="border border-border-color px-5 py-6 h-full flex items-center justify-center">
        <p className="text-sm text-text-faint font-mono text-center measure">
          Paste a function and run it to see a prediction here.
        </p>
      </div>
    );
  }

  const color = VERDICT_COLORS[result.prediction];
  const pct = Math.round(result.confidence * 1000) / 10;

  return (
    <motion.div
      key={result.prediction + result.confidence}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="border border-border-color px-5 py-6"
    >
      <p className="font-mono text-xs text-text-faint mb-1">Prediction</p>
      <div className="flex items-baseline gap-3">
        <span className="font-display text-3xl capitalize" style={{ color }}>
          {result.prediction}
        </span>
        <span className="font-mono text-sm text-text-dim">{pct.toFixed(1)}% confidence</span>
      </div>

      <div className="mt-4 h-1.5 w-full bg-surface-2 overflow-hidden">
        <motion.div
          className="h-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 font-mono text-xs text-text-dim">
        <div>
          <div className="text-text-faint">Nodes parsed</div>
          <div className="text-text mt-0.5">{result.graph.nodes.length}</div>
        </div>
        <div>
          <div className="text-text-faint">Edges parsed</div>
          <div className="text-text mt-0.5">{result.graph.edges.length}</div>
        </div>
      </div>
    </motion.div>
  );
}
