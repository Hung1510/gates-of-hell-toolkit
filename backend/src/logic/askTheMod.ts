import { loadAllFactions } from "../data/loader.js";
import { computeSquadStats } from "./squadStats.js";

export interface AskResult {
  interpretation: string; // what the query was understood as, shown to the user for transparency
  results: Array<Record<string, unknown>>;
}

// Deliberately NOT embeddings/vector search - this is regex-based intent
// detection over data we've already parsed and verified. Handles the three
// example query shapes plus a free-text fallback. Being upfront about this
// distinction matters: it's real and correct for these patterns, but it
// isn't semantic search and won't handle paraphrases outside them well.
export function askTheMod(query: string): AskResult {
  const q = query.trim().toLowerCase();
  const allFactions = loadAllFactions();

  // Pattern 1: "which squads use X" / "squads with X" / "units using X"
  const useMatch = q.match(/(?:use[s]?|with|contains?|carrying)\s+(.+?)\??$/i);
  if (useMatch && /(squad|unit)/.test(q)) {
    const term = useMatch[1].trim().toLowerCase();
    const results: Array<Record<string, unknown>> = [];
    for (const f of allFactions) {
      for (const s of f.squads) {
        const matchingSlots = s.slots.filter((sl) => sl.unitType.toLowerCase().includes(term));
        if (matchingSlots.length > 0) {
          results.push({
            faction: f.faction,
            squad: s.name,
            displayName: s.displayName,
            matchingUnitTypes: [...new Set(matchingSlots.map((sl) => sl.unitType))],
          });
        }
      }
    }
    return {
      interpretation: `Squads whose composition includes a unit type matching "${term}"`,
      results,
    };
  }

  // Pattern 2: "which units/squads unlock X" / "what unlocks X"
  const unlockMatch = q.match(/unlock(?:s)?\s+(.+?)\??$/i);
  if (unlockMatch) {
    const term = unlockMatch[1].trim().toLowerCase();
    const results: Array<Record<string, unknown>> = [];
    for (const f of allFactions) {
      // find squads whose name matches the term (the thing being unlocked)
      const matchingSquads = f.squads.filter((s) => s.name.toLowerCase().includes(term));
      for (const squad of matchingSquads) {
        // tech node ids often match squad names, sometimes with a "(faction)" suffix
        const node = f.techTree.find(
          (n) => n.id === squad.name || n.id === `${squad.name}(${f.faction})`
        );
        results.push({
          faction: f.faction,
          squad: squad.name,
          displayName: squad.displayName,
          unlockedBy: node ? { techNodeId: node.id, cost: node.cost, requires: node.requires } : "no matching tech node found (may be available by default)",
        });
      }
      // also check vehicle field directly (e.g. "Tiger" as a vehicle, not squad name)
      const matchingByVehicle = f.squads.filter((s) => s.vehicle?.toLowerCase().includes(term));
      for (const squad of matchingByVehicle) {
        if (matchingSquads.includes(squad)) continue;
        const node = f.techTree.find((n) => n.id === squad.name || n.id === `${squad.name}(${f.faction})`);
        results.push({
          faction: f.faction,
          squad: squad.name,
          displayName: squad.displayName,
          vehicle: squad.vehicle,
          unlockedBy: node ? { techNodeId: node.id, cost: node.cost, requires: node.requires } : "no matching tech node found",
        });
      }
    }
    return {
      interpretation: `Squads/vehicles matching "${term}", and the tech node that unlocks each (if found)`,
      results,
    };
  }

  // Pattern 3: "cost(ing) more than N" / "over N" / "> N" / "costing less than N" / "under N"
  const costMatch = q.match(/cost(?:ing)?\s*(more than|over|greater than|>|less than|under|<)\s*(\d+(?:\.\d+)?)/i);
  if (costMatch) {
    const direction = costMatch[1].toLowerCase();
    const threshold = parseFloat(costMatch[2]);
    const isMore = /more|over|greater|>/.test(direction);

    const results: Array<Record<string, unknown>> = [];
    for (const f of allFactions) {
      // individual priced units
      for (const u of f.unitCosts) {
        if (u.cost === null) continue;
        if ((isMore && u.cost > threshold) || (!isMore && u.cost < threshold)) {
          results.push({ faction: f.faction, kind: "unit", id: u.id, displayName: u.displayName, cost: u.cost });
        }
      }
      // squads (aggregate cost)
      for (const s of f.squads) {
        const stats = computeSquadStats(s, f.unitCostById);
        if (stats.totalCost === null) continue;
        if ((isMore && stats.totalCost > threshold) || (!isMore && stats.totalCost < threshold)) {
          results.push({ faction: f.faction, kind: "squad", id: s.name, displayName: s.displayName, cost: stats.totalCost });
        }
      }
    }
    results.sort((a, b) => (b.cost as number) - (a.cost as number));
    return {
      interpretation: `Units and squads costing ${isMore ? "more than" : "less than"} ${threshold} (across all 5 factions)`,
      results,
    };
  }

  // Fallback: free-text substring search across squad names, unit types, and tech ids
  const results: Array<Record<string, unknown>> = [];
  for (const f of allFactions) {
    for (const s of f.squads) {
      if (s.name.toLowerCase().includes(q) || s.slots.some((sl) => sl.unitType.toLowerCase().includes(q))) {
        results.push({ faction: f.faction, kind: "squad", id: s.name, displayName: s.displayName });
      }
    }
    for (const n of f.techTree) {
      if (n.id.toLowerCase().includes(q)) {
        results.push({ faction: f.faction, kind: "techNode", id: n.id, cost: n.cost });
      }
    }
  }
  return {
    interpretation: `Didn't match a known query pattern (use/unlock/cost) - falling back to free-text search for "${query}"`,
    results,
  };
}
