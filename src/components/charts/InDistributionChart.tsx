"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import { IN_DISTRIBUTION_TABLE } from "@/lib/content";
import { CHART_COLORS } from "./theme";

export default function InDistributionChart() {
  const data = IN_DISTRIBUTION_TABLE.map((r) => ({
    model: r.model,
    accuracy: r.accuracy,
    isGnn: r.model.startsWith("GNN"),
  }));

  return (
    <div className="h-[320px] w-full font-mono text-xs">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 8 }}>
          <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis
            dataKey="model"
            tick={{ fill: CHART_COLORS.mid, fontSize: 11 }}
            axisLine={{ stroke: CHART_COLORS.grid }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 1]}
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
            formatter={(value) => [Number(value).toFixed(4), "Accuracy"]}
          />
          <Bar dataKey="accuracy" radius={[2, 2, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.isGnn ? CHART_COLORS.highlight : CHART_COLORS.dim} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
