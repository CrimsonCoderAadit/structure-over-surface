import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import {
  ARCH_NULL_RESULTS,
  DOCSTRING_CONFOUND,
  GRAPHCODEBERT_DEADCODE,
  OBFUSCATION_TABLE,
  STRUCTURAL_REWRITE_TABLE,
} from "@/lib/content";

export const metadata: Metadata = { title: "Findings - Structure Over Surface" };

function Finding({
  title,
  accent,
  children,
}: {
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-20 first:mt-0">
      <Reveal>
        <h2 className="font-display text-2xl sm:text-3xl leading-snug border-l-2 pl-5" style={{ borderColor: accent }}>
          {title}
        </h2>
      </Reveal>
      <Reveal delay={0.08} className="mt-6 pl-5">
        <div className="measure text-text-dim leading-relaxed space-y-4 text-[0.98rem]">{children}</div>
      </Reveal>
    </section>
  );
}

export default function FindingsPage() {
  const clean = STRUCTURAL_REWRITE_TABLE[0];
  const inversion = STRUCTURAL_REWRITE_TABLE[1];
  const deadCode = STRUCTURAL_REWRITE_TABLE[2];
  const obf = OBFUSCATION_TABLE[1];

  return (
    <div className="mx-auto max-w-3xl px-5 sm:px-8 py-20 sm:py-28">
      <Reveal>
        <h1 className="font-display text-4xl sm:text-5xl">Findings</h1>
        <p className="measure mt-6 text-text-dim leading-relaxed">
          Four things this project actually found, reported the way they came out of the
          experiments, including the two that complicate the project&apos;s own thesis.
        </p>
      </Reveal>

      <Finding title="A docstring-rate confound, found and corrected" accent="#4fd1c5">
        <p>
          Human functions in this dataset carry docstrings far more often than
          machine-generated ones do. A model trained with docstrings present scores{" "}
          <span className="text-text font-mono">{DOCSTRING_CONFOUND.withDocstringsAccuracy.toFixed(4)}</span>{" "}
          accuracy on a clean test set, but that number collapses by{" "}
          <span className="text-text font-mono">{DOCSTRING_CONFOUND.droppedPointsAfterStrip}</span> points
          when docstrings are stripped only at inference time. Only{" "}
          <span className="text-text font-mono">
            {DOCSTRING_CONFOUND.matchingPredictions}/{DOCSTRING_CONFOUND.totalTest}
          </span>{" "}
          predictions still match the clean run once that surface signal is gone.
        </p>
        <p>
          The docstring-free model (
          <span className="text-text font-mono">{DOCSTRING_CONFOUND.docstringFreeAccuracy.toFixed(4)}</span>
          {" "}accuracy) is the honest headline number reported throughout this site, not the
          inflated 0.9301.
        </p>
      </Finding>

      <Finding title="Token obfuscation does nothing, dead code does a lot" accent="#f2b44d">
        <p>
          Variable renaming plus non-flow dead code leaves GNN accuracy completely
          unchanged: exactly{" "}
          <span className="text-text font-mono">{OBFUSCATION_TABLE[0].gnn.toFixed(4)}</span>{" "}
          across every obfuscation condition, because none of it touches graph structure.
          TF-IDF drops to{" "}
          <span className="text-text font-mono">{obf.tfidf.toFixed(4)}</span> and CodeBERT
          to <span className="text-text font-mono">{obf.codebert.toFixed(4)}</span> under
          the same obfuscation.
        </p>
        <p>
          Structural rewrites are a different story. If-inversion changes{" "}
          {inversion.changed}/186 test graphs and barely moves balanced accuracy (
          <span className="text-text font-mono">
            {inversion.balancedAccuracy.toFixed(4)} ± {inversion.sd.toFixed(4)}
          </span>
          ). Dead-code injection changes all {deadCode.changed}/186 and drops balanced
          accuracy to{" "}
          <span className="text-text font-mono">
            ~{deadCode.balancedAccuracy.toFixed(2)} ± {deadCode.sd.toFixed(3)}
          </span>
          , from a clean{" "}
          <span className="text-text font-mono">{clean.balancedAccuracy.toFixed(4)}</span>. The
          errors shift from balanced to strongly false-negative: injected dead code makes
          machine code read as human to this model.
        </p>
      </Finding>

      <Finding title="Two architectural choices that turned out not to matter" accent="#e85d75">
        <p>
          GIN versus GraphSAGE, at matched parameter count:{" "}
          <span className="text-text font-mono">{ARCH_NULL_RESULTS.ginVsSage.gin.toFixed(4)}</span> vs{" "}
          <span className="text-text font-mono">{ARCH_NULL_RESULTS.ginVsSage.sage.toFixed(4)}</span>{" "}
          balanced accuracy, a delta of{" "}
          <span className="text-text font-mono">{ARCH_NULL_RESULTS.ginVsSage.delta.toFixed(4)}</span>, 95%
          CI [{ARCH_NULL_RESULTS.ginVsSage.ci[0]}, {ARCH_NULL_RESULTS.ginVsSage.ci[1]}], Wilcoxon{" "}
          <span className="text-text font-mono">p = {ARCH_NULL_RESULTS.ginVsSage.p}</span>. Not a real win:
          GIN is kept for consistency, not because it demonstrably outperforms.
        </p>
        <p>
          Adding a fourth, dataflow/def-use edge type:{" "}
          <span className="text-text font-mono">{ARCH_NULL_RESULTS.edgeAblation.threeEdge.toFixed(4)}</span> vs{" "}
          <span className="text-text font-mono">{ARCH_NULL_RESULTS.edgeAblation.fourEdge.toFixed(4)}</span>{" "}
          accuracy, winning only {ARCH_NULL_RESULTS.edgeAblation.seedsWon} of{" "}
          {ARCH_NULL_RESULTS.edgeAblation.seedsTotal} seeds and losing on ROC-AUC. No
          significant benefit.
        </p>
      </Finding>

      <Finding title="GraphCodeBERT beats this GNN on structural robustness" accent="#e85d75">
        <p>
          Under dead-code injection, GraphCodeBERT scores{" "}
          <span className="text-text font-mono">
            {GRAPHCODEBERT_DEADCODE.graphCodeBert.balancedAccuracy.toFixed(4)}
          </span>{" "}
          balanced accuracy /{" "}
          <span className="text-text font-mono">{GRAPHCODEBERT_DEADCODE.graphCodeBert.rocAuc.toFixed(4)}</span>{" "}
          ROC-AUC, against this GNN&apos;s{" "}
          <span className="text-text font-mono">{GRAPHCODEBERT_DEADCODE.gnn.balancedAccuracy.toFixed(4)}</span> /{" "}
          <span className="text-text font-mono">{GRAPHCODEBERT_DEADCODE.gnn.rocAuc.toFixed(4)}</span> and plain
          CodeBERT&apos;s{" "}
          <span className="text-text font-mono">{GRAPHCODEBERT_DEADCODE.codebert.balancedAccuracy.toFixed(4)}</span>{" "}
          / <span className="text-text font-mono">{GRAPHCODEBERT_DEADCODE.codebert.rocAuc.toFixed(4)}</span>. The
          gap to the GNN is significant (Mann-Whitney{" "}
          <span className="text-text font-mono">p = {GRAPHCODEBERT_DEADCODE.pValueBalancedAccuracy}</span>{" "}
          balanced accuracy,{" "}
          <span className="text-text font-mono">p = {GRAPHCODEBERT_DEADCODE.pValueRocAuc}</span> ROC-AUC).
        </p>
        <p>
          GraphCodeBERT&apos;s own clean-to-dead-code drop is smaller too (
          <span className="text-text font-mono">
            {GRAPHCODEBERT_DEADCODE.graphCodeBert.cleanBalancedAccuracy.toFixed(4)} →{" "}
            {GRAPHCODEBERT_DEADCODE.graphCodeBert.balancedAccuracy.toFixed(4)}
          </span>
          ): its data-flow-aware pretraining gives it something like structural awareness
          without needing an explicit graph.
        </p>
        <p className="text-text">
          A token-level model with the right pretraining objective currently generalizes
          to structural adversarial edits better than a model built explicitly on
          structure. This is the finding the project set out to complicate, not confirm.
        </p>
      </Finding>
    </div>
  );
}
