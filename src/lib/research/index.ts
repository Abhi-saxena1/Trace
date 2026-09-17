import { seedDataset } from "../../data/seed";
import { runResearch } from "./pipeline";

// Bundled, reproducible data. No network requests, credentials or background crawling.
export function getResearch() {
  return runResearch(seedDataset);
}
