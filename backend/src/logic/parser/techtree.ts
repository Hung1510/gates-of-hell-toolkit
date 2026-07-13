import { Node } from "./ast.js";

export interface TechNode {
  id: string;
  displayName: string | null; // from the game's own .pot localization files, null if not found
  requires: string[]; // ids of prerequisite nodes (space-separated in source)
  cost: number;
  position: { x: number; y: number };
  isTechUpgrade: boolean; // true if declared with the "tech" keyword
}

// This file's grammar is flatter than squads: each entry is a "{ ... }" list
// containing a positional sequence of keyword/value tokens, e.g.:
//   { tech "defense_level_1" requires "reinforcement_stage_2" costs 1 position 2 0 }
//   {"conquest_fi156" requires "single_officer(ger)" costs 1 position 0 4}
// There's also a leading non-entry block: { positions { "single_officer(ger)" 0 2 } }
// which we skip (no "requires"/"costs" keywords present).
export function extractTechTree(topLevel: Node[]): TechNode[] {
  const nodes: TechNode[] = [];

  for (const node of topLevel) {
    if (node.kind !== "list" || node.bracket !== "{") continue;
    const items = node.items;

    let isTechUpgrade = false;
    let id: string | null = null;
    let requires: string[] = [];
    let cost: number | null = null;
    let position: { x: number; y: number } | null = null;

    let i = 0;
    while (i < items.length) {
      const item = items[i];

      if (item.kind === "word" && item.value === "tech") {
        isTechUpgrade = true;
        i++;
        continue;
      }
      if (item.kind === "string" && id === null) {
        id = item.value;
        i++;
        continue;
      }
      if (item.kind === "word" && item.value === "requires") {
        const next = items[i + 1];
        if (next && next.kind === "string") {
          requires = next.value.split(/\s+/).filter(Boolean);
        }
        i += 2;
        continue;
      }
      if (item.kind === "word" && item.value === "costs") {
        const next = items[i + 1];
        if (next && next.kind === "word") cost = parseFloat(next.value);
        i += 2;
        continue;
      }
      if (item.kind === "word" && item.value === "position") {
        const nx = items[i + 1];
        const ny = items[i + 2];
        if (nx?.kind === "word" && ny?.kind === "word") {
          position = { x: parseFloat(nx.value), y: parseFloat(ny.value) };
        }
        i += 3;
        continue;
      }
      // unrecognized token (e.g. the {positions {...}} block, or IconGap) - skip
      i++;
    }

    // Only accept nodes that look like real tech-tree entries
    if (id !== null && cost !== null && position !== null) {
      nodes.push({ id, displayName: null, requires, cost, position, isTechUpgrade });
    }
  }

  return nodes;
}
