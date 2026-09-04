"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import clsx from "clsx";
import AmbientStaticFallback from "./AmbientStaticFallback";

const AmbientGraphCanvas = dynamic(() => import("./AmbientGraphCanvas"), {
  ssr: false,
  loading: () => null,
});

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}

export default function AmbientBackground({
  seed,
  nodeCount,
  radius = 6.5,
  rotationSpeed = 0.02,
  variant = "fixed",
  className,
}: {
  seed: number;
  nodeCount: number;
  radius?: number;
  rotationSpeed?: number;
  /** "fixed" covers the viewport for a whole page; "absolute" fills the nearest
   * `relative` ancestor, for a bounded region like the /demo page's header. */
  variant?: "fixed" | "absolute";
  className?: string;
}) {
  const [mode, setMode] = useState<"pending" | "animated" | "static">("pending");

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setMode(reduced || !hasWebGL() ? "static" : "animated");
    });
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      className={clsx(
        // z-0 (not a negative z-index): WebGL canvases under a negative
        // z-index don't reliably composite in some browsers. DOM order (this
        // is mounted before Nav/main/Footer) is what keeps it behind content.
        variant === "fixed" ? "fixed inset-0 z-0" : "absolute inset-0 z-0",
        "overflow-hidden pointer-events-none",
        className
      )}
      aria-hidden="true"
    >
      {mode === "animated" && (
        <AmbientGraphCanvas nodeCount={nodeCount} seed={seed} radius={radius} rotationSpeed={rotationSpeed} />
      )}
      {mode === "static" && <AmbientStaticFallback seed={seed} nodeCount={nodeCount} radius={radius} />}
      <div className="absolute inset-0 bg-gradient-to-b from-bg/55 via-bg/25 to-bg/65" />
    </div>
  );
}
