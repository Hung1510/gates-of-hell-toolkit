import { loadAllFactions } from "./data/loader.js";
import { validateTechNode, computeGridBounds } from "./logic/techTreeValidation.js";

const factions = loadAllFactions();

console.log("=== False positive check: every real node against its own faction's tree ===");
for (const f of factions) {
  const bounds = computeGridBounds(f.techTree);
  let errorCount = 0;
  let warningCount = 0;
  for (const node of f.techTree) {
    const others = f.techTree.filter((n) => n.id !== node.id);
    const warnings = validateTechNode(node, others, bounds);
    errorCount += warnings.filter((w) => w.severity === "error").length;
    warningCount += warnings.filter((w) => w.severity === "warning").length;
  }
  console.log(`  ${f.faction}: ${f.techTree.length} nodes, ${errorCount} errors, ${warningCount} warnings (expected: 0 errors, a few warnings from the known single_officer quirk)`);
}

console.log("\n=== Cycle detection test (artificial) ===");
const ger = factions.find((f) => f.faction === "ger")!;
const nodeB = ger.techTree.find((n) => n.id === "defense_level_1")!;
const cyclicCandidate = { ...nodeB, requires: [...nodeB.requires, "defense_level_2"] };
const others = ger.techTree.filter((n) => n.id !== cyclicCandidate.id);
const bounds = computeGridBounds(ger.techTree);
console.log("Warnings:", JSON.stringify(validateTechNode(cyclicCandidate, others, bounds), null, 2));

console.log("\n=== Bounds test (artificial) ===");
const outOfBounds = { ...nodeB, position: { x: 9999, y: 9999 } };
console.log("Warnings:", JSON.stringify(validateTechNode(outOfBounds, others, bounds), null, 2));
