import type { Vehicle } from "../types";

export interface FrontArmor {
  mm: number;
  source: "explicit" | "fallback";
}

export type ArmorFacing = "front" | "side" | "rear";

// Volumes are named things like "body3"/"turret4", not literally "hull
// front" - so "effective armor" for any facing is a deliberate
// simplification: the thickest value among any volume's explicit facing
// override for that direction, or if a vehicle has none of those, the
// thickest base thickness across all its volumes (a real fallback, not a
// guess dressed up as fact).
export function getEffectiveArmor(vehicle: Vehicle | null, facing: ArmorFacing): FrontArmor | null {
  if (!vehicle || vehicle.armor.length === 0) return null;
  const explicit = vehicle.armor.map((a) => a.facings[facing]).filter((v): v is number => v !== undefined);
  if (explicit.length > 0) {
    return { mm: Math.max(...explicit), source: "explicit" };
  }
  return { mm: Math.max(...vehicle.armor.map((a) => a.baseThickness)), source: "fallback" };
}

// Kept for existing callers - equivalent to getEffectiveArmor(v, "front").
export function getEffectiveFrontArmor(vehicle: Vehicle | null): FrontArmor | null {
  return getEffectiveArmor(vehicle, "front");
}

export type PenetrationResult = "overmatch" | "penetrates" | "marginal" | "bounces";

export function classifyPenetration(penetrationMm: number, armorMm: number): PenetrationResult {
  const ratio = penetrationMm / armorMm;
  if (ratio >= 1.5) return "overmatch";
  if (ratio >= 1) return "penetrates";
  if (ratio >= 0.8) return "marginal";
  return "bounces";
}

export function resultLabel(result: PenetrationResult): string {
  switch (result) {
    case "overmatch":
      return "Overmatch";
    case "penetrates":
      return "Penetrates";
    case "marginal":
      return "Marginal";
    case "bounces":
      return "Bounces";
  }
}

// Finds the best (highest-penetration) ammo type + range point a vehicle's
// gun has against a given armor value - used by the Best Counter finder to
// rank many attackers against one defender by their single best shot.
export function bestShotAgainst(
  attacker: Vehicle,
  armorMm: number
): { shellType: string; rangeM: number; penetrationMm: number; result: PenetrationResult } | null {
  if (!attacker.gunStats || attacker.gunStats.shells.length === 0) return null;

  let best: { shellType: string; rangeM: number; penetrationMm: number } | null = null;
  for (const shell of attacker.gunStats.shells) {
    if (!shell.penetrationTable) continue;
    for (const point of shell.penetrationTable) {
      if (!best || point.penetrationMm > best.penetrationMm) {
        best = { shellType: shell.shellType, rangeM: point.rangeM, penetrationMm: point.penetrationMm };
      }
    }
  }
  if (!best) return null;
  return { ...best, result: classifyPenetration(best.penetrationMm, armorMm) };
}
