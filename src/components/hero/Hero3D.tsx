"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import StaticGraphFallback from "./StaticGraphFallback";

const ASTGraphCanvas = dynamic(() => import("./ASTGraphCanvas"), {
  ssr: false,
  loading: () => <StaticGraphFallback />,
});

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}

export default function Hero3D() {
  const [mode, setMode] = useState<"pending" | "animated" | "static">("pending");

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setMode(reduced || !hasWebGL() ? "static" : "animated");
    });
    return () => cancelAnimationFrame(id);
  }, []);

  if (mode === "pending") {
    return <StaticGraphFallback />;
  }

  if (mode === "static") {
    return <StaticGraphFallback />;
  }

  return <ASTGraphCanvas />;
}
