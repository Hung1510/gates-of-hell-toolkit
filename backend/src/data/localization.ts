import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { parsePot } from "../logic/parser/pot.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOC_DIR = path.join(__dirname, "samples", "localization");

// The game's own file naming is inconsistent across factions - these maps
// capture the real naming found in default.pak rather than assuming a
// uniform "desc_squad_<faction>.pot" / "desc_breed_mp_<faction>.pot"
// pattern (verified: USA's squad file has an "mp_" infix, and the "eng"
// faction's soldiers are localized under the "uk" breed file, not "eng").
const SQUAD_POT_FILE: Record<string, string> = {
  ger: "desc_squad_ger.pot",
  rus: "desc_squad_rus.pot",
  eng: "desc_squad_eng.pot",
  fin: "desc_squad_fin.pot",
  usa: "desc_squad_mp_usa.pot",
};

// Supplementary squad-name files found by listing default.pak's full
// contents rather than assuming the base file was complete: "_dcg_late"
// = Dynamic Campaign (Conquest mode), and it contains squad ids that are
// genuinely absent from the base desc_squad_<faction>.pot file (e.g.
// "squad_fusilier_late_con(ger)" isn't in desc_squad_ger.pot but is here).
// No "eng" dcg_late file exists in default.pak - not an oversight, just
// not present for that faction.
const SQUAD_POT_SUPPLEMENT_FILE: Partial<Record<string, string>> = {
  ger: "desc_squad_ger_dcg_late.pot",
  rus: "desc_squad_rus_dcg_late.pot",
  fin: "desc_squad_fin_dcg_late.pot",
  usa: "desc_squad_usa_dcg_late.pot",
};

const BREED_POT_FILE: Record<string, string> = {
  ger: "desc_breed_mp_ger.pot",
  rus: "desc_breed_mp_rus.pot",
  eng: "desc_breed_mp_uk.pot", // note: not "eng" - the game's own file is named "uk"
  fin: "desc_breed_mp_fin.pot",
  usa: "desc_breed_mp_usa.pot",
};

// Vehicle/weapon/equipment entity names - covers both squad.vehicle fields
// and tech tree node ids (many tech nodes ARE vehicle/weapon entity ids,
// e.g. "tiger1h" unlocks a vehicle, not a squad). "desc_vehicles_generic"
// applies to all factions (shared equipment like ammo crates); only "ger"
// has a "_fh" (Finest Hour DLC) supplement in default.pak.
const ENTITY_POT_FILES: Record<string, string[]> = {
  ger: ["desc_vehicles_ger.pot", "desc_vehicles_ger_fh.pot", "desc_vehicles_generic.pot"],
  rus: ["desc_vehicles_rus.pot", "desc_vehicles_generic.pot"],
  eng: ["desc_vehicles_eng.pot", "desc_vehicles_generic.pot"],
  fin: ["desc_vehicles_fin.pot", "desc_vehicles_generic.pot"],
  usa: ["desc_vehicles_usa.pot", "desc_vehicles_generic.pot"],
};

interface LocalizationData {
  squadNames: Map<string, string>; // key: `desc/squad/<squadname>(<faction>)` or without suffix, lowercased
  unitNames: Map<string, string>; // key: `desc/human/<fullpath>`, lowercased
  entityNames: Map<string, string>; // key: `desc/entity/<id>`, lowercased
}

let cache: Map<string, LocalizationData> | null = null;

function loadPotFile(filename: string): Map<string, string> {
  const filePath = path.join(LOC_DIR, filename);
  if (!existsSync(filePath)) return new Map();
  return parsePot(readFileSync(filePath, "utf-8"));
}

function loadAll(): Map<string, LocalizationData> {
  if (cache) return cache;
  cache = new Map();
  const factions = new Set([...Object.keys(SQUAD_POT_FILE), ...Object.keys(BREED_POT_FILE)]);
  for (const faction of factions) {
    const squadNames = SQUAD_POT_FILE[faction] ? loadPotFile(SQUAD_POT_FILE[faction]) : new Map();
    const supplement = SQUAD_POT_SUPPLEMENT_FILE[faction];
    if (supplement) {
      for (const [k, v] of loadPotFile(supplement)) {
        if (!squadNames.has(k)) squadNames.set(k, v);
      }
    }
    const unitNames = BREED_POT_FILE[faction] ? loadPotFile(BREED_POT_FILE[faction]) : new Map();

    const entityNames = new Map<string, string>();
    for (const filename of ENTITY_POT_FILES[faction] ?? []) {
      for (const [k, v] of loadPotFile(filename)) {
        if (!entityNames.has(k)) entityNames.set(k, v);
      }
    }

    cache.set(faction, { squadNames, unitNames, entityNames });
  }
  return cache;
}

// The game's own text uses in-engine rich-text markup like
// "<c(A5A095)>(1)</c> Osttruppen squad" for colored tier numbers. Strip it
// for clean display - modders reading this don't want raw markup.
function stripMarkup(text: string): string {
  return text
    .replace(/<c\([0-9a-fA-F]+\)>/g, "")
    .replace(/<\/c>/g, "")
    .trim();
}

// Squad entries in the .pot are keyed like "desc/squad/<name>(<faction>)",
// but some (mostly non-conquest-specific ones) omit the faction suffix
// entirely - we try both forms.
export function getSquadDisplayName(faction: string, squadName: string): string | null {
  const data = loadAll().get(faction);
  if (!data) return null;
  const withSuffix = `desc/squad/${squadName}(${faction})`.toLowerCase();
  const withoutSuffix = `desc/squad/${squadName}`.toLowerCase();
  const raw = data.squadNames.get(withSuffix) ?? data.squadNames.get(withoutSuffix) ?? null;
  return raw !== null ? stripMarkup(raw) : null;
}

// Unit (individual soldier) entries are keyed like "desc/human/<fullPath>",
// e.g. "desc/human/mp/ger/mid/officer".
export function getUnitDisplayName(faction: string, fullPath: string): string | null {
  const data = loadAll().get(faction);
  if (!data) return null;
  const key = `desc/human/${fullPath}`.toLowerCase();
  const raw = data.unitNames.get(key) ?? null;
  return raw !== null ? stripMarkup(raw) : null;
}

// Vehicle/weapon/equipment entries are keyed like "desc/entity/<id>", e.g.
// "desc/entity/tiger1h".
export function getEntityDisplayName(faction: string, entityId: string): string | null {
  const data = loadAll().get(faction);
  if (!data) return null;
  const key = `desc/entity/${entityId}`.toLowerCase();
  const raw = data.entityNames.get(key) ?? null;
  return raw !== null ? stripMarkup(raw) : null;
}

// Tech tree node ids are either a squad id (unlocking a unit/squad) or a
// vehicle/weapon entity id (unlocking equipment) - try both, squad first.
export function getTechNodeDisplayName(faction: string, nodeId: string): string | null {
  return getSquadDisplayName(faction, nodeId) ?? getEntityDisplayName(faction, nodeId);
}
