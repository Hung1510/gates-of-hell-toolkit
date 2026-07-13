import type { Squad } from "./parser/squads.js";
import type { UnitCost } from "./parser/unitcosts.js";

export interface SquadStats {
  totalMen: number;
  totalCost: number | null; // null if any slot's unit cost is unknown
  missingCostFor: string[]; // unit types we couldn't find a cost for
  perSlot: { slot: string; unitType: string; count: number; unitCost: number | null; subtotal: number | null }[];
}

export function computeSquadStats(squad: Squad, unitCostById: Map<string, UnitCost>): SquadStats {
  const perSlot = squad.slots.map((s) => {
    const unitCost = unitCostById.get(s.unitType)?.cost ?? null;
    return {
      slot: s.slot,
      unitType: s.unitType,
      count: s.count,
      unitCost,
      subtotal: unitCost !== null ? unitCost * s.count : null,
    };
  });

  const totalMen = squad.slots.reduce((sum, s) => sum + s.count, 0);
  const missingCostFor = perSlot.filter((p) => p.unitCost === null).map((p) => p.unitType);
  const totalCost =
    missingCostFor.length > 0 ? null : perSlot.reduce((sum, p) => sum + (p.subtotal ?? 0), 0);

  return { totalMen, totalCost, missingCostFor, perSlot };
}
