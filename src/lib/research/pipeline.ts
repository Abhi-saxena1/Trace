import type { Dataset, ExtractionProvider, ResearchSnapshot } from "./types";
import { DeterministicExtractor, isAnalyzable } from "./extraction/deterministic";
import { validateDataset, validateExtractions } from "./validation";
import { detectPatterns } from "./patterns/detect";
import { buildEvidenceGraph } from "./evidence/graph";
import { generateSignals } from "./signal/generate";
import { validateResearch } from "./findings-validation";
import { detectLaunchMechanics } from "./mechanics/detect";
import { analyzePerformance } from "./performance/analyze";

export async function runResearch(dataset: Dataset, provider: ExtractionProvider = new DeterministicExtractor()): Promise<ResearchSnapshot> {
  dataset = structuredClone(dataset);
  validateDataset(dataset);
  const extractions = await Promise.all(dataset.content.filter(isAnalyzable).map(async item => {
    const extraction = await provider.extract(structuredClone(item));
    if (extraction.content_item_id !== item.id || extraction.provider !== provider.id || extraction.version !== provider.version) {
      throw new Error("Extraction provider identity or content provenance mismatch");
    }
    return extraction;
  }));
  validateExtractions(dataset, extractions);
  const mechanics = detectLaunchMechanics(dataset, extractions);
  const performance = analyzePerformance(dataset);
  const { patterns, evidence } = detectPatterns(dataset, extractions, mechanics);
  const signal_candidates = generateSignals(patterns);
  const signal = signal_candidates[0] ?? null;
  const graph = buildEvidenceGraph(dataset, extractions, mechanics, patterns, evidence, signal_candidates);
  const snapshot = { dataset, extractions, mechanics, performance, patterns, evidence, graph, signal_candidates,
    signal, methodology_version: "4.0.0" };
  validateResearch(snapshot);
  return snapshot;
}
