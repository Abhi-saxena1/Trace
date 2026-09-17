import { isDeepStrictEqual } from "node:util";
import type { ResearchSnapshot } from "./types";
import { validateDataset, validateExtractions } from "./validation";
import { detectPatterns } from "./patterns/detect";
import { generateSignals } from "./signal/generate";
import { buildEvidenceGraph } from "./evidence/graph";
import { detectLaunchMechanics } from "./mechanics/detect";
import { analyzePerformance } from "./performance/analyze";

/** Fail closed at the publication boundary; citations alone do not validate an inference. */
export function validateResearch(snapshot: ResearchSnapshot): void {
  validateDataset(snapshot.dataset);
  validateExtractions(snapshot.dataset, snapshot.extractions);
  const mechanics = detectLaunchMechanics(snapshot.dataset, snapshot.extractions);
  if (!isDeepStrictEqual(snapshot.mechanics, mechanics)) throw new Error("Invalid findings: altered launch mechanics, timing or content relationships");
  if (!isDeepStrictEqual(snapshot.performance, analyzePerformance(snapshot.dataset))) throw new Error("Invalid findings: altered public response coverage or comparison state");
  const expected = detectPatterns(snapshot.dataset, snapshot.extractions, mechanics);
  if (!isDeepStrictEqual(snapshot.evidence, expected.evidence)) {
    throw new Error("Invalid findings: evidence contains orphaned claims, altered quotes or mismatched provenance");
  }
  if (!isDeepStrictEqual(snapshot.patterns, expected.patterns)) {
    throw new Error("Invalid findings: unsupported pattern, confidence, event coverage or counterevidence");
  }
  const signals = generateSignals(expected.patterns);
  if (!isDeepStrictEqual(snapshot.signal_candidates, signals) || !isDeepStrictEqual(snapshot.signal, signals[0] ?? null)) {
    throw new Error("Invalid findings: unsupported signal or missing evidence references");
  }
  const graph = buildEvidenceGraph(snapshot.dataset, snapshot.extractions, mechanics, expected.patterns, expected.evidence, signals);
  if (!isDeepStrictEqual(snapshot.graph, graph)) throw new Error("Invalid findings: orphaned or altered provenance graph");
}
