import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import path from "path";
import { parse } from "./ast.js";
import { extractDefines } from "./defines.js";
import type { Node } from "./ast.js";

// Weapon files reference templates defined in ".presets" files that can
// live in the weapon's own directory OR any ancestor directory up to the
// weapons root (verified: rifle/sniper/.presets and rifle/.presets both
// exist with potentially different definitions of the same template name,
// e.g. "penetration" has different parameter conventions in rifle/.presets
// vs gun/.presets). Closer/deeper directories override farther/shallower
// ones when merged.
export function buildRegistryForPath(weaponFileDir: string, weaponsRoot: string): Map<string, Node[]> {
  const dirsFromRootToLeaf: string[] = [];
  let current = path.resolve(weaponFileDir);
  const root = path.resolve(weaponsRoot);

  while (true) {
    dirsFromRootToLeaf.unshift(current);
    if (current === root) break;
    const parent = path.dirname(current);
    if (parent === current) break; // reached filesystem root without hitting weaponsRoot - stop
    current = parent;
  }

  const registry = new Map<string, Node[]>();
  for (const dir of dirsFromRootToLeaf) {
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      let stat;
      try {
        stat = statSync(full);
      } catch {
        continue;
      }
      if (!stat.isFile()) continue;
      // skip obviously binary/mesh files by extension - defines only live in text config files
      if (/\.(ply|mdl|mtl|dds|tga|anm|vol|ebm|tex)$/i.test(entry)) continue;

      try {
        const text = readFileSync(full, "utf-8");
        const ast = parse(text);
        const defines = extractDefines(ast);
        for (const [name, body] of defines) {
          registry.set(name, body); // deeper directory processed later, overrides shallower
        }
      } catch {
        continue;
      }
    }
  }

  return registry;
}
