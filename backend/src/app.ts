import express from "express";
import cors from "cors";
import multer from "multer";
import { loadAllFactions, getFaction } from "./data/loader.js";
import { serializeSquad, serializeTechNode } from "./logic/parser/serialize.js";
import { parse } from "./logic/parser/ast.js";
import { extractSquads } from "./logic/parser/squads.js";
import { extractTechTree } from "./logic/parser/techtree.js";
import { computeSquadStats } from "./logic/squadStats.js";
import { validateTechNode, computeGridBounds } from "./logic/techTreeValidation.js";
import { askTheMod } from "./logic/askTheMod.js";
import { inspectSave, editSave } from "./logic/saveEditor.js";
import { loadAllVehicles, getVehiclesForFaction } from "./data/vehicleLoader.js";
import { loadAllSoldierWeapons } from "./data/soldierWeaponLoader.js";
import { loadAllWeapons } from "./data/weaponBrowserLoader.js";
import type { Squad } from "./logic/parser/squads.js";
import type { TechNode } from "./logic/parser/techtree.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  // GET /api/factions -> list of factions with counts (lightweight index)
  app.get("/api/factions", (_req, res) => {
    const data = loadAllFactions().map((f) => ({
      faction: f.faction,
      squadCount: f.squads.length,
      techNodeCount: f.techTree.length,
    }));
    res.json(data);
  });

  // GET /api/squads?faction=ger -> all squads for a faction (all factions if omitted)
  app.get("/api/squads", (req, res) => {
    const faction = req.query.faction as string | undefined;
    if (faction) {
      const data = getFaction(faction);
      if (!data) {
        res.status(404).json({ error: `Unknown faction: ${faction}` });
        return;
      }
      res.json(data.squads);
      return;
    }
    res.json(loadAllFactions().flatMap((f) => f.squads));
  });

  // GET /api/techtree?faction=ger -> tech tree nodes for a faction
  app.get("/api/techtree", (req, res) => {
    const faction = req.query.faction as string | undefined;
    if (!faction) {
      res.status(400).json({ error: "faction query param is required" });
      return;
    }
    const data = getFaction(faction);
    if (!data) {
      res.status(404).json({ error: `Unknown faction: ${faction}` });
      return;
    }
    res.json(data.techTree);
  });

  // GET /api/templates?faction=ger -> distinct squad "shapes" (template name +
  // slot-key pattern), so the builder UI can offer a real, valid template to
  // start from instead of a free-text guess.
  app.get("/api/templates", (req, res) => {
    const faction = req.query.faction as string | undefined;
    const squads = faction ? getFaction(faction)?.squads ?? [] : loadAllFactions().flatMap((f) => f.squads);

    const seen = new Map<string, { template: string; slotKeys: string[]; isVehicle: boolean; exampleCount: number }>();
    for (const s of squads) {
      const slotKeys = s.slots.map((sl) => sl.slot);
      const key = `${s.template}::${slotKeys.join(",")}`;
      const existing = seen.get(key);
      if (existing) {
        existing.exampleCount++;
      } else {
        seen.set(key, {
          template: s.template,
          slotKeys,
          isVehicle: s.vehicle !== null || s.wrapperName !== null,
          exampleCount: 1,
        });
      }
    }
    res.json([...seen.values()]);
  });

  // GET /api/units?faction=ger -> distinct unit type ids used across squad
  // slots, for the builder's slot autocomplete.
  app.get("/api/units", (req, res) => {
    const faction = req.query.faction as string | undefined;
    const squads = faction ? getFaction(faction)?.squads ?? [] : loadAllFactions().flatMap((f) => f.squads);
    const units = new Set<string>();
    for (const s of squads) {
      for (const slot of s.slots) units.add(slot.unitType);
    }
    res.json([...units].sort());
  });

  // GET /api/units/costs?faction=ger -> full unit cost list, for client-side
  // squad cost computation used by the advanced filters in the browser.
  app.get("/api/units/costs", (req, res) => {
    const faction = req.query.faction as string | undefined;
    if (!faction) {
      res.status(400).json({ error: "faction query param is required" });
      return;
    }
    const data = getFaction(faction);
    if (!data) {
      res.status(404).json({ error: `Unknown faction: ${faction}` });
      return;
    }
    res.json(data.unitCosts);
  });

  // POST /api/build/squad -> body is a Squad object (as produced by the
  // browser's builder form); returns the serialized .set snippet, and also
  // re-parses it as a sanity check before handing it back.
  app.post("/api/build/squad", (req, res) => {
    const squad = req.body as Squad;
    if (!squad || !squad.template || !squad.name) {
      res.status(400).json({ error: "template and name are required" });
      return;
    }
    try {
      const code = serializeSquad(squad);
      const reparsed = extractSquads(parse(code));
      if (reparsed.length !== 1) {
        res.status(500).json({ error: "generated snippet failed to re-parse cleanly", code });
        return;
      }
      res.json({ code, parsedBack: reparsed[0] });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // POST /api/build/technode -> body is a TechNode object; returns the
  // serialized .set snippet, re-parsed as a sanity check.
  app.post("/api/build/technode", (req, res) => {
    const node = req.body as TechNode;
    if (!node || !node.id || !node.position) {
      res.status(400).json({ error: "id and position are required" });
      return;
    }
    try {
      const code = serializeTechNode(node);
      const reparsed = extractTechTree(parse(code));
      if (reparsed.length !== 1) {
        res.status(500).json({ error: "generated snippet failed to re-parse cleanly", code });
        return;
      }
      res.json({ code, parsedBack: reparsed[0] });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // GET /api/squads/stats?faction=ger&name=squad_officer_con
  // -> total cost/men for one squad, with any un-priced units flagged
  //    explicitly rather than silently treated as free.
  app.get("/api/squads/stats", (req, res) => {
    const faction = req.query.faction as string | undefined;
    const name = req.query.name as string | undefined;
    if (!faction || !name) {
      res.status(400).json({ error: "faction and name query params are required" });
      return;
    }
    const data = getFaction(faction);
    if (!data) {
      res.status(404).json({ error: `Unknown faction: ${faction}` });
      return;
    }
    const squad = data.squads.find((s) => s.name === name);
    if (!squad) {
      res.status(404).json({ error: `Unknown squad: ${name}` });
      return;
    }
    res.json({ squad, stats: computeSquadStats(squad, data.unitCostById) });
  });

  // GET /api/compare?a=ger:squad_officer_con&b=usa:squad_rifle_con
  // -> side-by-side stats for two squads (any faction/squad combo).
  app.get("/api/compare", (req, res) => {
    const parseRef = (raw: string | undefined) => {
      if (!raw) return null;
      const [faction, ...rest] = raw.split(":");
      const name = rest.join(":");
      if (!faction || !name) return null;
      return { faction, name };
    };

    const a = parseRef(req.query.a as string | undefined);
    const b = parseRef(req.query.b as string | undefined);
    if (!a || !b) {
      res.status(400).json({ error: "a and b query params are required, format faction:squadName" });
      return;
    }

    const results = [a, b].map((ref) => {
      const data = getFaction(ref.faction);
      const squad = data?.squads.find((s) => s.name === ref.name);
      if (!data || !squad) {
        return { faction: ref.faction, name: ref.name, error: "not found" };
      }
      return { faction: ref.faction, name: ref.name, squad, stats: computeSquadStats(squad, data.unitCostById) };
    });

    res.json(results);
  });

  // POST /api/save/inspect (multipart, field "file") -> parsed status fields
  app.post("/api/save/inspect", upload.single("file"), (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded (expected multipart field 'file')" });
      return;
    }
    try {
      const info = inspectSave(req.file.buffer);
      res.json(info);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // POST /api/save/edit (multipart, field "file", plus mp/sp/ap/rp form fields)
  // -> returns the modified .sav as a binary download. Stateless: the
  // original file is re-uploaded each time since we don't keep server-side
  // session state.
  app.post("/api/save/edit", upload.single("file"), (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded (expected multipart field 'file')" });
      return;
    }
    const edits: Record<string, string> = {};
    for (const key of ["mp", "sp", "ap", "rp"]) {
      if (typeof req.body[key] === "string" && req.body[key] !== "") {
        edits[key] = req.body[key];
      }
    }
    try {
      const newBuffer = editSave(req.file.buffer, edits);
      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader("Content-Disposition", `attachment; filename="${req.file.originalname}"`);
      res.send(newBuffer);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // POST /api/techtree/validate -> body: { faction, node: TechNode }
  // Runs the candidate node against the rest of that faction's real tree
  // (cycle detection, bounds check, position collision, unknown requires).
  // Does NOT persist anything - purely a check, safe to call on every
  // keystroke from the editor.
  app.post("/api/techtree/validate", (req, res) => {
    const { faction, node } = req.body as { faction?: string; node?: TechNode };
    if (!faction || !node) {
      res.status(400).json({ error: "faction and node are required" });
      return;
    }
    const data = getFaction(faction);
    if (!data) {
      res.status(404).json({ error: `Unknown faction: ${faction}` });
      return;
    }
    const bounds = computeGridBounds(data.techTree);
    const warnings = validateTechNode(node, data.techTree, bounds);
    res.json({ warnings });
  });

  // GET /api/ask?q=... -> structured query search over real, already-parsed
  // data (NOT embeddings/vector search - regex-based intent detection).
  app.get("/api/ask", (req, res) => {
    const q = req.query.q as string | undefined;
    if (!q) {
      res.status(400).json({ error: "q query param is required" });
      return;
    }
    res.json(askTheMod(q));
  });

  // GET /api/vehicles?faction=rus -> real vehicle armor + weapon-slot + mobility
  // data, parsed from the game's own .def/.ext files. Coverage varies by
  // faction depending on what's been uploaded so far - see
  // /api/vehicles/factions for exact counts, don't assume all 5 are equally
  // complete.
  app.get("/api/vehicles", (req, res) => {
    const faction = req.query.faction as string | undefined;
    if (!faction) {
      res.status(400).json({ error: "faction query param is required" });
      return;
    }
    res.json(getVehiclesForFaction(faction));
  });

  // GET /api/vehicles/factions -> which factions have vehicle data loaded
  // and how much, so the frontend can show honest coverage rather than
  // silently showing an empty list for a faction with no data yet.
  app.get("/api/vehicles/factions", (_req, res) => {
    const all = loadAllVehicles();
    const summary = [...all.entries()].map(([faction, vehicles]) => ({
      faction,
      count: vehicles.length,
      withArmor: vehicles.filter((v) => v.armor.length > 0).length,
      withWeapon: vehicles.filter((v) => v.weapons.length > 0).length,
    }));
    res.json(summary);
  });

  // GET /api/units/weapons?faction=ger -> resolved primary weapon + real
  // damage/rpm/penetration stats per soldier, where resolvable (verified
  // against real values - see README for the K98k/Mosin/MG34 cross-checks
  // done before trusting this resolver). Currently ~62% of all soldiers
  // resolve to a full damage stat; the rest are mostly support roles
  // without a combat weapon file, or the one known malformed item id
  // ("panzershreck_54 weapon") - not hidden, just not resolvable yet.
  app.get("/api/units/weapons", (req, res) => {
    const faction = req.query.faction as string | undefined;
    const all = loadAllSoldierWeapons();
    const filtered = faction ? all.filter((s) => s.faction === faction) : all;
    res.json(filtered);
  });

  // GET /api/weapons -> every resolved weapon across all categories,
  // independent of which soldier/vehicle carries it. Only includes files
  // where the resolver actually produced meaningful stats (damage,
  // calibre, or per-shell data) - filters out accessories/scopes/ammo
  // definitions that share the same folders.
  app.get("/api/weapons", (_req, res) => {
    res.json(loadAllWeapons());
  });

  return app;
}
