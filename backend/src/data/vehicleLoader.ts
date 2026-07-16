import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { parse } from "../logic/parser/ast.js";
import { extractArmorVolumes, ArmorVolume } from "../logic/parser/vehicleArmor.js";
import { extractVehicleDef, VehicleDef } from "../logic/parser/vehicleDef.js";
import { resolveWeaponFile } from "../logic/parser/weaponFileResolver.js";
import { ResolvedWeaponStats } from "../logic/parser/weaponResolver.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VEHICLES_DIR = path.join(__dirname, "samples", "vehicles");
const WEAPONS_ROOT = path.join(__dirname, "samples", "weapons", "stuff");
const GUN_CATEGORIES = ["gun", "mgun", "rifle"]; // vehicle-mounted weapons found in these so far

export interface Vehicle {
  id: string;
  faction: string;
  category: string; // e.g. "tank_medium", "cannon", "car" - inferred from folder structure
  weapons: string[]; // raw list - may include non-combat "weapon" slots like vision/searchlight
  primaryWeapon: string | null; // best-effort guess at the actual gun, excluding known non-combat slots
  gunStats: ResolvedWeaponStats | null; // resolved damage/penetration for primaryWeapon, where found
  mass: number | null;
  targetClass: string | null;
  mobility: VehicleDef["mobility"];
  armor: ArmorVolume[];
}

// Known non-combat entries that the engine tags as "weapon" slots but aren't
// actual armament - vision systems, searchlights, etc. Not exhaustive; this
// is a best-effort heuristic, not a verified classification.
const NON_COMBAT_WEAPON_PATTERNS = [/vision/i, /searchlight/i, /periscope/i];

function guessPrimaryWeapon(weapons: string[]): string | null {
  return weapons.find((w) => !NON_COMBAT_WEAPON_PATTERNS.some((p) => p.test(w))) ?? null;
}

const gunStatsCache = new Map<string, ResolvedWeaponStats | null>();

function resolveGunStatsCached(weaponId: string): ResolvedWeaponStats | null {
  if (gunStatsCache.has(weaponId)) return gunStatsCache.get(weaponId)!;
  for (const cat of GUN_CATEGORIES) {
    const candidate = path.join(WEAPONS_ROOT, cat, weaponId);
    if (existsSync(candidate)) {
      try {
        const stats = resolveWeaponFile(candidate, WEAPONS_ROOT);
        gunStatsCache.set(weaponId, stats);
        return stats;
      } catch {
        break;
      }
    }
  }
  gunStatsCache.set(weaponId, null);
  return null;
}

function findDefFiles(dir: string, results: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    // skip wreck/destroyed decoration variants - not real playable vehicles
    if (entry === "x" || entry.endsWith("_x") || entry.endsWith("_xx")) continue;
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      findDefFiles(full, results);
    } else if (entry.endsWith(".def")) {
      results.push(full);
    }
  }
  return results;
}

function inferCategory(defPath: string, faction: string): string {
  // paths look like .../vehicles/<faction>/[<faction_wrapper>/]<category>/<vehicle_id>/<vehicle_id>.def
  const relative = path.relative(path.join(VEHICLES_DIR, faction), defPath);
  const parts = relative.split(path.sep);
  // parts: [maybe wrapper folder, category, vehicle_id, filename] or [category, vehicle_id, filename]
  if (parts.length >= 3) {
    // the category is always the second-to-last directory (immediate parent of the vehicle's own folder)
    return parts[parts.length - 3];
  }
  return "unknown";
}

let cache: Map<string, Vehicle[]> | null = null;

export function loadAllVehicles(): Map<string, Vehicle[]> {
  if (cache) return cache;
  cache = new Map();

  if (!existsSync(VEHICLES_DIR)) return cache;

  for (const faction of readdirSync(VEHICLES_DIR)) {
    const factionDir = path.join(VEHICLES_DIR, faction);
    if (!statSync(factionDir).isDirectory()) continue;

    const defFiles = findDefFiles(factionDir);
    const vehicles: Vehicle[] = [];

    for (const defPath of defFiles) {
      const id = path.basename(defPath, ".def");
      const dir = path.dirname(defPath);
      const extPath = path.join(dir, `${id}.ext`);

      let weapons: string[] = [];
      let mass: number | null = null;
      let targetClass: string | null = null;
      let mobility: VehicleDef["mobility"] = null;
      try {
        const defAst = parse(readFileSync(defPath, "utf-8"));
        const parsed = extractVehicleDef(defAst);
        weapons = parsed.weapons;
        mass = parsed.mass;
        targetClass = parsed.targetClass;
        mobility = parsed.mobility;
      } catch {
        // malformed/unusual .def - skip stats but still list the vehicle
      }

      let armor: ArmorVolume[] = [];
      if (existsSync(extPath)) {
        try {
          const extAst = parse(readFileSync(extPath, "utf-8"));
          armor = extractArmorVolumes(extAst);
        } catch {
          armor = [];
        }
      }

      const primaryWeapon = guessPrimaryWeapon(weapons);

      vehicles.push({
        id,
        faction,
        category: inferCategory(defPath, faction),
        weapons,
        primaryWeapon,
        gunStats: primaryWeapon ? resolveGunStatsCached(primaryWeapon) : null,
        mass,
        targetClass,
        mobility,
        armor,
      });
    }

    cache.set(faction, vehicles);
  }

  return cache;
}

export function getVehiclesForFaction(faction: string): Vehicle[] {
  return loadAllVehicles().get(faction) ?? [];
}
