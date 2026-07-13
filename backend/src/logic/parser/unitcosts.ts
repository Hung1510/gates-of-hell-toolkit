import { Node } from "./ast.js";
import { parseCall } from "./calls.js";

export interface UnitCost {
  id: string; // basename, e.g. "officer" - matches Squad slot.unitType
  displayName: string | null; // from the game's own .pot localization files, null if not found
  fullPath: string; // e.g. "mp/ger/mid/officer"
  template: string; // e.g. "inf_officer", "inf_tier1"
  cost: number | null;
}

function toFloat(v: string | undefined): number | null {
  if (v === undefined || v === "") return null;
  const n = parseFloat(v);
  return Number.isNaN(n) ? null : n;
}

// inf_<faction>.set entries look like:
//   {"mp/ger/mid/officer"  ("inf_officer" side(ger) cost(60.0))}
//   {"mp/ger/late/volkssturm_pol" ("inf_tier1" side(ger) lvl(lvl1 lvl2) r(12) rm(99) cost(7.0))}
export function extractUnitCosts(topLevel: Node[]): UnitCost[] {
  const units: UnitCost[] = [];

  for (const node of topLevel) {
    if (node.kind !== "list" || node.bracket !== "{") continue;

    let fullPath: string | null = null;
    let callNode: Node | null = null;
    for (const child of node.items) {
      if (child.kind === "string" && fullPath === null) {
        fullPath = child.value;
        continue;
      }
      if (child.kind === "list" && child.bracket === "(") {
        callNode = child;
      }
    }
    if (!fullPath || !callNode) continue;

    const call = parseCall(callNode);
    if (!call || !call.head) continue;

    const basename = fullPath.split("/").pop() ?? fullPath;
    units.push({
      id: basename,
      displayName: null, // enriched later in loader.ts
      fullPath,
      template: call.head,
      cost: toFloat(call.args.cost),
    });
  }

  return units;
}
