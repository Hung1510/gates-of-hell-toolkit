import { readFileSync, existsSync } from "fs";
import path from "path";
import { parse } from "./ast.js";
import { buildRegistryForPath } from "./weaponRegistry.js";
import { resolveWeaponStats, ResolvedWeaponStats, ShellStats } from "./weaponResolver.js";
import { Node } from "./ast.js";

// Merges a base weapon's resolved stats with an override weapon's resolved
// stats - override wins for any field it actually sets, base fills in
// anything override left null. Shells are merged by shellType (override's
// per-field values win when both define the same shell).
function mergeWeaponStats(base: ResolvedWeaponStats, override: ResolvedWeaponStats): ResolvedWeaponStats {
  const shellMap = new Map<string, ShellStats>();
  for (const s of base.shells) shellMap.set(s.shellType, { ...s });
  for (const s of override.shells) {
    const existing = shellMap.get(s.shellType);
    if (existing) {
      shellMap.set(s.shellType, {
        shellType: s.shellType,
        damage: s.damage ?? existing.damage,
        penetrationTable: s.penetrationTable ?? existing.penetrationTable,
      });
    } else {
      shellMap.set(s.shellType, s);
    }
  }

  return {
    damage: override.damage ?? base.damage,
    damageTarget: override.damageTarget ?? base.damageTarget,
    rpm: override.rpm ?? base.rpm,
    penetrationTable: override.penetrationTable ?? base.penetrationTable,
    calibre: override.calibre ?? base.calibre,
    velocity: override.velocity ?? base.velocity,
    shells: [...shellMap.values()],
    unresolvedTemplates: [...new Set([...base.unresolvedTemplates, ...override.unresolvedTemplates])],
  };
}

function findFromFileReference(topLevel: Node[], dir: string): string | null {
  for (const node of topLevel) {
    if (node.kind !== "list" || node.bracket !== "{") continue;
    if (node.items[0]?.kind !== "word" || node.items[0].value !== "from") continue;
    const nameNode = node.items[1];
    if (nameNode?.kind !== "string") continue;
    // only treat this as a file reference if a sibling file with that
    // exact name actually exists (otherwise it's a `define`-based
    // template reference, already handled inside resolveWeaponStats
    // itself, which correctly ignores it here)
    const candidate = path.join(dir, nameNode.value);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

// Resolves a weapon file, following {from "other_weapon_file"} chains
// (verified real case: SU-85's gun file "85mm_d5s" is just
// {from "85mm_zis53" (a couple of overrides)} - the actual damage/
// penetration values live in "85mm_zis53", not "85mm_d5s" itself).
// Recurses to handle multi-level chains, with a depth limit as a safety
// net against unexpected cycles.
export function resolveWeaponFile(filePath: string, weaponsRoot: string, depth = 0): ResolvedWeaponStats {
  const dir = path.dirname(filePath);
  const registry = buildRegistryForPath(dir, weaponsRoot);
  const ast = parse(readFileSync(filePath, "utf-8"));
  const ownStats = resolveWeaponStats(ast, registry);

  if (depth > 5) return ownStats; // safety net, not expected to trigger on real data

  const baseFilePath = findFromFileReference(ast, dir);
  if (!baseFilePath || baseFilePath === filePath) return ownStats;

  const baseStats = resolveWeaponFile(baseFilePath, weaponsRoot, depth + 1);
  return mergeWeaponStats(baseStats, ownStats);
}
