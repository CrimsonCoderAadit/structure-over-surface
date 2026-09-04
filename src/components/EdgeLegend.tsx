import { EDGE_TYPE_LIST } from "@/lib/edgeTypes";
import clsx from "clsx";

export default function EdgeLegend({ className, dense }: { className?: string; dense?: boolean }) {
  return (
    <ul className={clsx("flex flex-wrap gap-x-6 gap-y-2 font-mono", dense ? "text-xs" : "text-sm", className)}>
      {EDGE_TYPE_LIST.map((e) => (
        <li key={e.key} className="flex items-center gap-2 text-text-dim">
          <span
            className="inline-block w-3 h-[2.5px] rounded-full"
            style={{ background: e.color }}
            aria-hidden
          />
          <span className="text-text">{e.label}</span>
        </li>
      ))}
    </ul>
  );
}
