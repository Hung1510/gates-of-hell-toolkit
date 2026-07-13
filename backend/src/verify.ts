import { loadAllFactions } from "./data/loader.js";
import { computeSquadStats } from "./logic/squadStats.js";

const factions = loadAllFactions();
console.log(`Factions loaded: ${factions.map((f) => f.faction).join(", ")}`);
for (const f of factions) {
  const noName = f.squads.filter((s) => !s.name).length;
  const noSide = f.squads.filter((s) => !s.side).length;
  const ids = new Set(f.techTree.map((t) => t.id));
  const allRequires = f.techTree.flatMap((t) => t.requires);
  const unresolved = [...new Set(allRequires.filter((r) => !ids.has(r)))];

  console.log(`\n  ${f.faction}: ${f.squads.length} squads, ${f.techTree.length} tech nodes, ${f.unitCosts.length} priced units`);
  console.log(`    squads missing name: ${noName}, missing side: ${noSide}`);
  console.log(`    tech unresolved requires (${unresolved.length}):`, unresolved.slice(0, 6));

  const fullyPriced = f.squads.filter((s) => computeSquadStats(s, f.unitCostById).totalCost !== null);
  const missingTypes = new Set<string>();
  for (const s of f.squads) {
    const stats = computeSquadStats(s, f.unitCostById);
    stats.missingCostFor.forEach((t) => missingTypes.add(t));
  }
  console.log(`    squads fully priced: ${fullyPriced.length}/${f.squads.length}`);
  console.log(`    unit types missing a price (${missingTypes.size}):`, [...missingTypes].slice(0, 10));
}
