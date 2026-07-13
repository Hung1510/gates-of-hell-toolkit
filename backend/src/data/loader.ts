import { readdirSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { parse } from "../logic/parser/ast.js";
import { extractSquads } from "../logic/parser/squads.js";
import { extractTechTree } from "../logic/parser/techtree.js";
import { extractUnitCosts } from "../logic/parser/unitcosts.js";
import { getSquadDisplayName, getUnitDisplayName, getEntityDisplayName, getTechNodeDisplayName } from "./localization.js";
import type { Squad, TechNode, Faction } from "../types.js";
import type { UnitCost } from "../logic/parser/unitcosts.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SAMPLES_DIR = path.join(__dirname, "samples");

export interface FactionData {
  faction: Faction;
  squads: Squad[];
  techTree: TechNode[];
  unitCosts: UnitCost[];
  unitCostById: Map<string, UnitCost>;
}

// Drop additional `units_<faction>.set` / `unit_research_<faction>.set` /
// `inf_<faction>.set` triples into src/data/samples/ and they'll be picked up
// automatically - no code changes needed.
function discoverFactions(): Faction[] {
  const files = readdirSync(SAMPLES_DIR);
  const factions = new Set<string>();
  for (const f of files) {
    const m = f.match(/^units_(\w+)\.set$/);
    if (m) factions.add(m[1]);
  }
  return [...factions] as Faction[];
}

let cache: FactionData[] | null = null;

export function loadAllFactions(): FactionData[] {
  if (cache) return cache;

  const factions = discoverFactions();
  cache = factions.map((faction) => {
    const unitsPath = path.join(SAMPLES_DIR, `units_${faction}.set`);
    const researchPath = path.join(SAMPLES_DIR, `unit_research_${faction}.set`);
    const infPath = path.join(SAMPLES_DIR, `inf_${faction}.set`);

    const squads = extractSquads(parse(readFileSync(unitsPath, "utf-8"))).map((s) => ({
      ...s,
      displayName: getSquadDisplayName(faction, s.name),
      vehicleDisplayName: s.vehicle ? getEntityDisplayName(faction, s.vehicle) : null,
    }));

    let techTree: TechNode[] = [];
    try {
      techTree = extractTechTree(parse(readFileSync(researchPath, "utf-8"))).map((n) => ({
        ...n,
        displayName: getTechNodeDisplayName(faction, n.id),
      }));
    } catch {
      // research file for this faction not present yet - squads still usable
      techTree = [];
    }

    let unitCosts: UnitCost[] = [];
    try {
      unitCosts = extractUnitCosts(parse(readFileSync(infPath, "utf-8"))).map((u) => ({
        ...u,
        displayName: getUnitDisplayName(faction, u.fullPath),
      }));
    } catch {
      // inf_<faction>.set not present yet - cost data just won't be available
      unitCosts = [];
    }
    const unitCostById = new Map(unitCosts.map((u) => [u.id, u]));

    return { faction, squads, techTree, unitCosts, unitCostById };
  });

  return cache;
}

export function getFaction(faction: string): FactionData | undefined {
  return loadAllFactions().find((f) => f.faction === faction);
}
