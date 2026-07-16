import { describe, it, expect } from "vitest";
import { loadAllFactions } from "../../data/loader.js";
import { validateTechNode, computeGridBounds } from "../techTreeValidation.js";

describe("validateTechNode", () => {
  const factions = loadAllFactions();

  for (const f of factions) {
    it(`produces zero errors for any real ${f.faction} tech node validated against its own tree`, () => {
      const bounds = computeGridBounds(f.techTree);
      for (const node of f.techTree) {
        const others = f.techTree.filter((n) => n.id !== node.id);
        const warnings = validateTechNode(node, others, bounds);
        const errors = warnings.filter((w) => w.severity === "error");
        expect(errors).toHaveLength(0);
      }
    });
  }

  it("detects an injected 2-node cycle", () => {
    const ger = factions.find((f) => f.faction === "ger")!;
    const nodeB = ger.techTree.find((n) => n.id === "defense_level_1")!;
    const cyclic = { ...nodeB, requires: [...nodeB.requires, "defense_level_2"] };
    const others = ger.techTree.filter((n) => n.id !== cyclic.id);
    const bounds = computeGridBounds(ger.techTree);

    const warnings = validateTechNode(cyclic, others, bounds);
    const cycleError = warnings.find((w) => w.severity === "error" && w.message.includes("Cyclic"));
    expect(cycleError).toBeDefined();
  });

  it("flags an out-of-bounds position", () => {
    const ger = factions.find((f) => f.faction === "ger")!;
    const nodeB = ger.techTree.find((n) => n.id === "defense_level_1")!;
    const outOfBounds = { ...nodeB, position: { x: 9999, y: 9999 } };
    const others = ger.techTree.filter((n) => n.id !== outOfBounds.id);
    const bounds = computeGridBounds(ger.techTree);

    const warnings = validateTechNode(outOfBounds, others, bounds);
    expect(warnings.some((w) => w.message.includes("outside the observed grid range"))).toBe(true);
  });

  it("flags self-reference as an error", () => {
    const ger = factions.find((f) => f.faction === "ger")!;
    const node = ger.techTree[0];
    const selfRef = { ...node, requires: [...node.requires, node.id] };
    const others = ger.techTree.filter((n) => n.id !== selfRef.id);
    const bounds = computeGridBounds(ger.techTree);

    const warnings = validateTechNode(selfRef, others, bounds);
    expect(warnings.some((w) => w.severity === "error" && w.message.includes("requires itself"))).toBe(true);
  });

  it("flags negative cost as an error", () => {
    const ger = factions.find((f) => f.faction === "ger")!;
    const node = { ...ger.techTree[0], cost: -5 };
    const others = ger.techTree.filter((n) => n.id !== node.id);
    const bounds = computeGridBounds(ger.techTree);

    const warnings = validateTechNode(node, others, bounds);
    expect(warnings.some((w) => w.severity === "error" && w.message.includes("negative"))).toBe(true);
  });
});
