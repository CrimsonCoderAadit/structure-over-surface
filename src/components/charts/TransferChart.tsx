"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TRANSFER_TABLE } from "@/lib/content";
import { CHART_COLORS } from "./theme";

export default function TransferChart() {
  const data = [...TRANSFER_TABLE].sort((a, b) => b.balancedAccuracy - a.balancedAccuracy);

  return (
    <div className="h-[340px] w-full font-mono text-xs">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 8 }}>
          <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis
            dataKey="generator"
            tick={{ fill: CHART_COLORS.mid, fontSize: 10.5 }}
            axisLine={{ stroke: CHART_COLORS.grid }}
            tickLine={false}
            interval={0}
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
            formatter={(value, name) => [Number(value).toFixed(4), String(name)]}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: CHART_COLORS.mid }} />
          <Bar dataKey="recall" name="Recall" fill={CHART_COLORS.dim} radius={[2, 2, 0, 0]} />
          <Bar
            dataKey="balancedAccuracy"
            name="Balanced accuracy"
            fill={CHART_COLORS.highlight}
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
