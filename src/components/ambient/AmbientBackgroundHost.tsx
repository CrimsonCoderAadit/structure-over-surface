"use client";

import { usePathname } from "next/navigation";
import AmbientBackground from "./AmbientBackground";

// Each route gets its own seed/density/drift so the loop doesn't feel like
// one copy-pasted background: same colors and behavior everywhere, a
// different scatter per page. /demo opts out here: its header gets a
// bounded instance mounted directly in the page (see demo/page.tsx), and
// the graph panel gets none at all.
const ROUTE_CONFIG: Record<string, { seed: number; nodeCount: number; radius: number; rotationSpeed: number } | null> = {
  "/": { seed: 1013, nodeCount: 14, radius: 7, rotationSpeed: 0.015 },
  "/methodology": { seed: 2027, nodeCount: 20, radius: 6, rotationSpeed: 0.024 },
  "/results": { seed: 3041, nodeCount: 17, radius: 6.5, rotationSpeed: 0.018 },
  "/findings": { seed: 4057, nodeCount: 23, radius: 6.5, rotationSpeed: 0.026 },
  "/demo": null,
};

export default function AmbientBackgroundHost() {
  const pathname = usePathname();
  const config = pathname in ROUTE_CONFIG ? ROUTE_CONFIG[pathname] : ROUTE_CONFIG["/"];
  if (!config) return null;
  return <AmbientBackground key={pathname} {...config} />;
}
