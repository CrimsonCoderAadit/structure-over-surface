"use client";

import { Bar, BarChart, CartesianGrid, ErrorBar, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import { STRUCTURAL_REWRITE_TABLE } from "@/lib/content";
import { CHART_COLORS } from "./theme";

export default function StructuralRewriteChart() {
  return (
    <div className="h-[300px] w-full font-mono text-xs">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={STRUCTURAL_REWRITE_TABLE} margin={{ top: 8, right: 12, left: -12, bottom: 8 }}>
          <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis
            dataKey="condition"
            tick={{ fill: CHART_COLORS.mid, fontSize: 11 }}
            axisLine={{ stroke: CHART_COLORS.grid }}
            tickLine={false}
          />
          <YAxis
            domain={[0.7, 0.9]}
            tick={{ fill: CHART_COLORS.mid, fontSize: 11 }}
            axisLine={{ stroke: CHART_COLORS.grid }}
            tickLine={false}
            tickFormatter={(v) => v.toFixed(2)}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
            contentStyle={{
              background: "#13151a",
              border: "1px solid #23262e",
              borderRadius: 0,
              fontFamily: "var(--font-mono)",
              fontSize: 12,
            }}
            labelStyle={{ color: CHART_COLORS.bright }}
            formatter={(value) => [Number(value).toFixed(4), "Balanced accuracy"]}
          />
          <Bar dataKey="balancedAccuracy" radius={[2, 2, 0, 0]}>
            <ErrorBar dataKey="sd" width={4} strokeWidth={1} stroke={CHART_COLORS.mid} />
            {STRUCTURAL_REWRITE_TABLE.map((d, i) => (
              <Cell key={i} fill={d.condition === "Clean" ? CHART_COLORS.dim : CHART_COLORS.highlight} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
