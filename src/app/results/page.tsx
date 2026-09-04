import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import InDistributionChart from "@/components/charts/InDistributionChart";
import TransferChart from "@/components/charts/TransferChart";
import StructuralRewriteChart from "@/components/charts/StructuralRewriteChart";
import {
  GNN_ROC_AUC,
  IN_DISTRIBUTION_TABLE,
  TRANSFER_COMPARISON,
  TRANSFER_TABLE,
} from "@/lib/content";

export const metadata: Metadata = { title: "Results - Structure Over Surface" };

export default function ResultsPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 sm:px-8 py-20 sm:py-28">
      <Reveal>
        <h1 className="font-display text-4xl sm:text-5xl">Results</h1>
        <p className="measure mt-6 text-text-dim leading-relaxed">
          In-distribution accuracy against token- and length-based baselines, then
          cross-generator transfer to generators the model never trained on.
        </p>
      </Reveal>

      <section className="mt-20">
        <Reveal>
          <h2 className="font-display text-2xl">In-distribution accuracy</h2>
          <p className="text-sm text-text-faint mt-1 font-mono">docstring-free · test set, n=186</p>
        </Reveal>

        <Reveal delay={0.08} className="mt-8">
          <InDistributionChart />
        </Reveal>

        <Reveal delay={0.12} className="mt-8 overflow-x-auto">
          <table className="w-full text-sm font-mono border-collapse">
            <thead>
              <tr className="text-text-dim border-b border-border-color">
                <th className="text-left font-normal py-2 pr-4">Model</th>
                <th className="text-right font-normal py-2 px-4">Accuracy</th>
                <th className="text-right font-normal py-2 px-4">Balanced accuracy</th>
                <th className="text-right font-normal py-2 pl-4">F1</th>
              </tr>
            </thead>
            <tbody>
              {IN_DISTRIBUTION_TABLE.map((r) => (
                <tr key={r.model} className="border-b border-border-color/60">
                  <td className="py-2.5 pr-4 text-text">{r.model}</td>
                  <td className="py-2.5 px-4 text-right text-text-dim">{r.accuracy.toFixed(4)}</td>
                  <td className="py-2.5 px-4 text-right text-text-dim">
                    {r.balancedAccuracy.toFixed(4)}
                    {r.balancedAccuracySd ? ` ± ${r.balancedAccuracySd.toFixed(4)}` : ""}
                  </td>
                  <td className="py-2.5 pl-4 text-right text-text-dim">{r.f1.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-xs text-text-faint font-mono">
            GNN ROC-AUC: {GNN_ROC_AUC.mean.toFixed(4)} ± {GNN_ROC_AUC.sd.toFixed(4)} (5-seed mean)
          </p>
        </Reveal>
      </section>

      <section className="mt-24">
        <Reveal>
          <h2 className="font-display text-2xl">Cross-generator transfer</h2>
          <p className="text-sm text-text-faint mt-1 font-mono">GNN, generators unseen in training</p>
        </Reveal>

        <Reveal delay={0.08} className="mt-8">
          <TransferChart />
        </Reveal>

        <Reveal delay={0.12} className="mt-8 overflow-x-auto">
          <table className="w-full text-sm font-mono border-collapse">
            <thead>
              <tr className="text-text-dim border-b border-border-color">
                <th className="text-left font-normal py-2 pr-4">Generator</th>
                <th className="text-right font-normal py-2 px-4">n</th>
                <th className="text-right font-normal py-2 px-4">Recall</th>
                <th className="text-right font-normal py-2 pl-4">Balanced accuracy</th>
              </tr>
            </thead>
            <tbody>
              {TRANSFER_TABLE.map((r) => (
                <tr key={r.generator} className="border-b border-border-color/60">
                  <td className="py-2.5 pr-4 text-text">{r.generator}</td>
                  <td className="py-2.5 px-4 text-right text-text-dim">{r.n}</td>
                  <td className="py-2.5 px-4 text-right text-text-dim">{r.recall.toFixed(4)}</td>
                  <td className="py-2.5 pl-4 text-right text-text-dim">{r.balancedAccuracy.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Reveal>

        <Reveal delay={0.16} className="mt-6 border border-border-color px-5 py-4">
          <p className="measure text-sm text-text-dim leading-relaxed">
            CodeBERT and GraphCodeBERT transfer higher across all four generators.
            GraphCodeBERT averages{" "}
            <span className="text-text font-mono">{TRANSFER_COMPARISON.graphCodeBert.balancedAccuracy.toFixed(4)}</span>{" "}
            balanced accuracy /{" "}
            <span className="text-text font-mono">{TRANSFER_COMPARISON.graphCodeBert.rocAuc.toFixed(4)}</span>{" "}
            ROC-AUC, versus the GNN&apos;s{" "}
            <span className="text-text font-mono">{TRANSFER_COMPARISON.gnn.balancedAccuracy.toFixed(4)}</span> /{" "}
            <span className="text-text font-mono">{TRANSFER_COMPARISON.gnn.rocAuc.toFixed(4)}</span>.
          </p>
        </Reveal>
      </section>

      <section className="mt-24">
        <Reveal>
          <h2 className="font-display text-2xl">Structural rewrites</h2>
          <p className="text-sm text-text-faint mt-1 font-mono">GNN balanced accuracy, 5-seed mean ± sd</p>
        </Reveal>
        <Reveal delay={0.08} className="mt-8">
          <StructuralRewriteChart />
        </Reveal>
        <Reveal delay={0.12}>
          <p className="measure mt-6 text-sm text-text-dim leading-relaxed">
            If-inversion changes 31 of 186 test graphs and barely moves accuracy. Dead-code
            injection changes all 186 and drops balanced accuracy by roughly five points.
            The full breakdown, including why, is on the{" "}
            <a href="/findings" className="text-edge-flow hover:text-text">
              findings
            </a>{" "}
            page.
          </p>
        </Reveal>
      </section>
    </div>
  );
}
