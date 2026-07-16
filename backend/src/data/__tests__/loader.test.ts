import { describe, it, expect } from "vitest";
import { loadAllFactions } from "../loader.js";
import { computeSquadStats } from "../../logic/squadStats.js";

describe("loadAllFactions", () => {
  const factions = loadAllFactions();

  it("loads all 5 known factions", () => {
    const names = factions.map((f) => f.faction).sort();
    expect(names).toEqual(["eng", "fin", "ger", "rus", "usa"]);
  });

  for (const f of factions) {
    it(`${f.faction}: every squad has a name and a side`, () => {
      expect(f.squads.every((s) => !!s.name)).toBe(true);
      expect(f.squads.every((s) => !!s.side)).toBe(true);
    });

    it(`${f.faction}: tech tree has at most one unresolved requires target (the known single_officer quirk)`, () => {
      const ids = new Set(f.techTree.map((n) => n.id));
      const allRequires = f.techTree.flatMap((n) => n.requires);
      const unresolved = new Set(allRequires.filter((r) => !ids.has(r)));
      // every unresolved id should be exactly the single_officer(<faction>) quirk
      for (const id of unresolved) {
        expect(id).toBe(`single_officer(${f.faction})`);
      }
    });

    it(`${f.faction}: at least 95% of squads are fully priced`, () => {
      const priced = f.squads.filter((s) => computeSquadStats(s, f.unitCostById).totalCost !== null);
      expect(priced.length / f.squads.length).toBeGreaterThan(0.95);
    });

    it(`${f.faction}: at least 80% of individual soldiers have a display name`, () => {
      // measured real values: ger 99.7%, rus 100%, eng 84.9%, fin 98.9%, usa 99% -
      // eng is the lowest, so the threshold is set below that with margin,
      // not tuned to whatever number happened to come out
      const named = f.unitCosts.filter((u) => u.displayName !== null);
      expect(named.length / f.unitCosts.length).toBeGreaterThan(0.8);
    });

    it(`${f.faction}: 100% of vehicle-crewed squads have a vehicle display name`, () => {
      const vehicleSquads = f.squads.filter((s) => s.vehicle !== null);
      if (vehicleSquads.length === 0) return; // no vehicle squads for this faction's data - not a failure
      const named = vehicleSquads.filter((s) => s.vehicleDisplayName !== null);
      expect(named.length).toBe(vehicleSquads.length);
    });

    it(`${f.faction}: at least 80% of tech tree nodes have a display name`, () => {
      const named = f.techTree.filter((n) => n.displayName !== null);
      expect(named.length / f.techTree.length).toBeGreaterThan(0.8);
    });

    it(`${f.faction}: no display name contains unstripped engine markup`, () => {
      const allNames = [
        ...f.squads.map((s) => s.displayName),
        ...f.unitCosts.map((u) => u.displayName),
        ...f.techTree.map((n) => n.displayName),
      ].filter((n): n is string => n !== null);
      expect(allNames.every((n) => !n.includes("<c(") && !n.includes("</c>"))).toBe(true);
    });
  }
});
