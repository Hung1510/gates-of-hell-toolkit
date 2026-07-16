import { describe, it, expect } from "vitest";
import { loadAllFactions } from "../../../data/loader.js";
import { parse } from "../ast.js";
import { extractSquads } from "../squads.js";
import { extractTechTree } from "../techtree.js";
import { serializeSquad, serializeTechNode } from "../serialize.js";
import type { Squad } from "../squads.js";
import type { TechNode } from "../techtree.js";

function squadsSemanticEqual(a: Squad, b: Squad): boolean {
  return (
    a.template === b.template &&
    a.name === b.name &&
    a.side === b.side &&
    a.period === b.period &&
    a.minStage === b.minStage &&
    a.maxStage === b.maxStage &&
    a.vehicle === b.vehicle &&
    JSON.stringify(a.slots) === JSON.stringify(b.slots)
  );
}

function techSemanticEqual(a: TechNode, b: TechNode): boolean {
  return (
    a.id === b.id &&
    a.cost === b.cost &&
    a.isTechUpgrade === b.isTechUpgrade &&
    JSON.stringify(a.requires) === JSON.stringify(b.requires) &&
    a.position.x === b.position.x &&
    a.position.y === b.position.y
  );
}

describe("round-trip: parse -> serialize -> re-parse", () => {
  const factions = loadAllFactions();

  it("has real data loaded to test against (sanity check for the tests themselves)", () => {
    expect(factions.length).toBeGreaterThan(0);
    expect(factions.reduce((sum, f) => sum + f.squads.length, 0)).toBeGreaterThan(1000);
  });

  for (const f of factions) {
    it(`round-trips all ${f.squads.length} squads for ${f.faction} identically`, () => {
      for (const squad of f.squads) {
        const text = serializeSquad(squad);
        const reparsed = extractSquads(parse(text));
        expect(reparsed).toHaveLength(1);
        expect(squadsSemanticEqual(squad, reparsed[0])).toBe(true);
      }
    });

    it(`round-trips all ${f.techTree.length} tech nodes for ${f.faction} identically`, () => {
      for (const node of f.techTree) {
        const text = serializeTechNode(node);
        const reparsed = extractTechTree(parse(text));
        expect(reparsed).toHaveLength(1);
        expect(techSemanticEqual(node, reparsed[0])).toBe(true);
      }
    });
  }
});
