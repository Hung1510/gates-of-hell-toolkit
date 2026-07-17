import { readdirSync, statSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { resolveWeaponFile } from "../logic/parser/weaponFileResolver.js";
import { ResolvedWeaponStats } from "../logic/parser/weaponResolver.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEAPONS_ROOT = path.join(__dirname, "samples", "weapons", "stuff");

const CATEGORIES = ["rifle", "mgun", "gun", "pistol", "bazooka", "smg", "mortar", "flame", "melee"];
const SUBFOLDERS = ["", "ptr", "sniper", "grenade"];

// Non-weapon files that live alongside real weapons in the same folders -
// ammo definitions and template/config files, filtered by extension.
// Deliberately NOT filtering by name patterns like "_scope"/"_bipod" -
// verified a real case (mg13_no_bipod_x2) where that would have wrongly
// excluded a genuine distinct weapon variant. The only reliable filter is
// whether the resolver actually produces meaningful stats.
const SKIP_SUFFIXES = [".ammo", ".pattern", ".hand", ".fsm", ".ebm"];
const SKIP_NAME_PATTERNS = [/^\./];

export interface BrowsableWeapon {
  id: string;
  category: string;
  stats: ResolvedWeaponStats;
}

let cache: BrowsableWeapon[] | null = null;

function hasUsefulStats(stats: ResolvedWeaponStats): boolean {
  return stats.damage !== null || stats.calibre !== null || stats.shells.length > 0;
}

export function loadAllWeapons(): BrowsableWeapon[] {
  if (cache) return cache;
  cache = [];

  for (const category of CATEGORIES) {
    for (const sub of SUBFOLDERS) {
      const dir = sub ? path.join(WEAPONS_ROOT, category, sub) : path.join(WEAPONS_ROOT, category);
      if (!existsSync(dir)) continue;

      for (const entry of readdirSync(dir)) {
        if (SKIP_SUFFIXES.some((s) => entry.endsWith(s))) continue;
        if (SKIP_NAME_PATTERNS.some((p) => p.test(entry))) continue;

        const fullPath = path.join(dir, entry);
        if (!statSync(fullPath).isFile()) continue;

        try {
          const stats = resolveWeaponFile(fullPath, WEAPONS_ROOT);
          if (hasUsefulStats(stats)) {
            cache.push({ id: entry, category: sub ? `${category}/${sub}` : category, stats });
          }
        } catch {
          continue;
        }
      }
    }
  }

  return cache;
}
