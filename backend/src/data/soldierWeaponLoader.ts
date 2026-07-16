import { readFileSync, existsSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { parse } from "../logic/parser/ast.js";
import { extractSoldierInventory } from "../logic/parser/soldierInventory.js";
import { buildRegistryForPath } from "../logic/parser/weaponRegistry.js";
import { resolveWeaponStats, ResolvedWeaponStats } from "../logic/parser/weaponResolver.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BREED_ROOT = path.join(__dirname, "samples", "breed", "mp");
const WEAPONS_ROOT = path.join(__dirname, "samples", "weapons", "stuff");

const WEAPON_CATEGORIES = ["rifle", "mgun", "gun", "pistol", "bazooka", "smg", "mortar", "flame", "melee"];
const WEAPON_EXTENSIONS = ["", ".weapon", ".grenade", ".mine"];

export interface SoldierWeaponInfo {
  unitId: string; // matches Squad slot.unitType / UnitCost.id, e.g. "rifleman_1"
  faction: string;
  period: string;
  primaryWeapon: string | null;
  weaponStats: ResolvedWeaponStats | null;
}

function findWeaponFile(itemId: string): string | null {
  // weapon item ids can contain spaces in some inventory references (e.g.
  // "rifle_ger clip ammo") but real weapon files are keyed by a clean id -
  // only look up items that look like plausible file names (no spaces)
  if (itemId.includes(" ")) return null;
  const subfolders = ["", "ptr", "sniper", "grenade"]; // e.g. rifle/ptr/, rifle/sniper/ - not just rifle/ directly
  for (const cat of WEAPON_CATEGORIES) {
    for (const sub of subfolders) {
      for (const ext of WEAPON_EXTENSIONS) {
        const candidate = sub
          ? path.join(WEAPONS_ROOT, cat, sub, itemId + ext)
          : path.join(WEAPONS_ROOT, cat, itemId + ext);
        if (existsSync(candidate)) return candidate;
      }
    }
  }
  return null;
}

let cache: SoldierWeaponInfo[] | null = null;
const weaponStatsCache = new Map<string, ResolvedWeaponStats | null>();

function resolveWeaponCached(itemId: string): ResolvedWeaponStats | null {
  if (weaponStatsCache.has(itemId)) return weaponStatsCache.get(itemId)!;
  const weaponPath = findWeaponFile(itemId);
  if (!weaponPath) {
    weaponStatsCache.set(itemId, null);
    return null;
  }
  try {
    const registry = buildRegistryForPath(path.dirname(weaponPath), WEAPONS_ROOT);
    const ast = parse(readFileSync(weaponPath, "utf-8"));
    const stats = resolveWeaponStats(ast, registry);
    weaponStatsCache.set(itemId, stats);
    return stats;
  } catch {
    weaponStatsCache.set(itemId, null);
    return null;
  }
}

export function loadAllSoldierWeapons(): SoldierWeaponInfo[] {
  if (cache) return cache;
  cache = [];

  if (!existsSync(BREED_ROOT)) return cache;

  for (const faction of readdirSync(BREED_ROOT)) {
    const factionDir = path.join(BREED_ROOT, faction);
    for (const period of readdirSync(factionDir)) {
      const periodDir = path.join(factionDir, period);
      for (const entry of readdirSync(periodDir)) {
        if (!entry.endsWith(".set")) continue;
        const unitId = entry.replace(/\.set$/, "");
        const filePath = path.join(periodDir, entry);
        try {
          const ast = parse(readFileSync(filePath, "utf-8"));
          const inv = extractSoldierInventory(ast);
          const weaponStats = inv.primaryWeapon ? resolveWeaponCached(inv.primaryWeapon) : null;
          cache.push({ unitId, faction, period, primaryWeapon: inv.primaryWeapon, weaponStats });
        } catch {
          continue;
        }
      }
    }
  }

  return cache;
}

export function getSoldierWeapon(faction: string, unitId: string): SoldierWeaponInfo | undefined {
  return loadAllSoldierWeapons().find((s) => s.faction === faction && s.unitId === unitId);
}
