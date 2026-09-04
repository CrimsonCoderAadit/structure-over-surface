// Exact figures from the project audit. Do not round or invent numbers here:
// every value in this file should be traceable to a results file in the research repo.

export const DATASET = {
  totalPairs: 927,
  human: 927,
  machine: 927,
  generatorForTraining: "Gemini 3 Flash Preview",
  train: 1482,
  val: 186,
  test: 186,
};

export const MODEL = {
  name: "Graph Isomorphism Network (GIN)",
  layers: 3,
  hiddenDim: 128,
  pooling: "mean + max",
};

export const IN_DISTRIBUTION_TABLE = [
  { model: "Length baseline", accuracy: 0.5323, balancedAccuracy: 0.5323, f1: 0.5953 },
  { model: "TF-IDF (token)", accuracy: 0.9301, balancedAccuracy: 0.9301, f1: 0.9319 },
  { model: "CodeBERT", accuracy: 0.9516, balancedAccuracy: 0.9516, f1: 0.9524 },
  {
    model: "GNN (structure-only)",
    accuracy: 0.8548,
    balancedAccuracy: 0.8538,
    balancedAccuracySd: 0.0092,
    f1: 0.8421,
  },
];

export const GNN_ROC_AUC = { mean: 0.9367, sd: 0.0057 };

export const TRANSFER_TABLE = [
  { generator: "Gemini 2.5 Pro", n: 848, recall: 0.8125, balancedAccuracy: 0.874 },
  { generator: "Qwen2.5-Coder:7b", n: 400, recall: 0.8925, balancedAccuracy: 0.914 },
  { generator: "Claude", n: 50, recall: 0.64, balancedAccuracy: 0.7877 },
  { generator: "Gemini 2.5 Flash", n: 41, recall: 0.7073, balancedAccuracy: 0.8214 },
];

export const TRANSFER_COMPARISON = {
  gnn: { balancedAccuracy: 0.874, rocAuc: 0.9447 },
  graphCodeBert: { balancedAccuracy: 0.9113, rocAuc: 0.9703 },
};

export const OBFUSCATION_TABLE = [
  { condition: "Clean", gnn: 0.8548, tfidf: 0.9301, codebert: 0.9498 },
  { condition: "Token obfuscation", gnn: 0.8548, tfidf: 0.7957, codebert: 0.848 },
];

export const STRUCTURAL_REWRITE_TABLE = [
  { condition: "Clean", changed: 0, balancedAccuracy: 0.8538, sd: 0.0092 },
  { condition: "If-inversion", changed: 31, balancedAccuracy: 0.8516, sd: 0.0116 },
  { condition: "Dead-code injection", changed: 186, balancedAccuracy: 0.8, sd: 0.024 },
];

export const ARCH_NULL_RESULTS = {
  ginVsSage: {
    gin: 0.8538,
    sage: 0.8495,
    delta: 0.0043,
    ci: [-0.0172, 0.0258] as [number, number],
    p: 0.875,
  },
  edgeAblation: {
    threeEdge: 0.8591,
    fourEdge: 0.8645,
    seedsWon: 5,
    seedsTotal: 10,
  },
};

export const GRAPHCODEBERT_DEADCODE = {
  gnn: { balancedAccuracy: 0.8011, rocAuc: 0.921 },
  codebert: { balancedAccuracy: 0.819, rocAuc: 0.9603 },
  graphCodeBert: { balancedAccuracy: 0.8889, rocAuc: 0.969, cleanBalancedAccuracy: 0.948 },
  pValueBalancedAccuracy: 0.0358,
  pValueRocAuc: 0.0357,
};

export const DOCSTRING_CONFOUND = {
  withDocstringsAccuracy: 0.9301,
  docstringFreeAccuracy: 0.8548,
  droppedPointsAfterStrip: 37.7,
  matchingPredictions: 60,
  totalTest: 186,
};
