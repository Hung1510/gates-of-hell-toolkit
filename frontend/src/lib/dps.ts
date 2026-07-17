import type { UnitWeaponInfo } from "../types";

export interface UnitDpsContribution {
  unitType: string;
  count: number;
  damage: number | null;
  rpm: number | null;
  unitDps: number | null; // one soldier's DPS (damage * rpm/60)
  totalDps: number | null; // unitDps * count
}

export interface SquadDpsResult {
  dps: number | null; // null if ANY unit in the squad is unresolved - avoids a misleading partial number
  missingFor: string[];
  breakdown: UnitDpsContribution[]; // always populated per-slot, even when the squad-level dps is null
}

export function computeSquadDps(
  slots: { unitType: string; count: number }[] | undefined,
  period: string | null | undefined,
  weaponsByKey: Map<string, UnitWeaponInfo>
): SquadDpsResult {
  if (!slots || !period) return { dps: null, missingFor: [], breakdown: [] };

  let total = 0;
  const missingFor: string[] = [];
  const breakdown: UnitDpsContribution[] = [];

  for (const s of slots) {
    const info = weaponsByKey.get(`${s.unitType}:${period}`);
    const damage = info?.weaponStats?.damage ?? null;
    const rpm = info?.weaponStats?.rpm ?? null;

    if (damage === null || rpm === null) {
      missingFor.push(s.unitType);
      breakdown.push({ unitType: s.unitType, count: s.count, damage, rpm, unitDps: null, totalDps: null });
      continue;
    }

    const unitDps = damage * (rpm / 60);
    const totalDps = unitDps * s.count;
    total += totalDps;
    breakdown.push({ unitType: s.unitType, count: s.count, damage, rpm, unitDps, totalDps });
  }

  return { dps: missingFor.length > 0 ? null : total, missingFor, breakdown };
}
