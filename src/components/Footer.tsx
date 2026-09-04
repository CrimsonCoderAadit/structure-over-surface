import { EDGE_TYPE_LIST } from "@/lib/edgeTypes";

export default function Footer() {
  return (
    <footer className="border-t border-border-color mt-32">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-10 flex flex-col sm:flex-row gap-6 sm:items-center sm:justify-between">
        <p className="font-mono text-xs text-text-faint">
          Structure Over Surface — a solo research project. GIN over AST graphs.
        </p>
        <ul className="flex items-center gap-4 font-mono text-xs text-text-dim">
          {EDGE_TYPE_LIST.map((e) => (
            <li key={e.key} className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: e.color }} />
              {e.short}
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
