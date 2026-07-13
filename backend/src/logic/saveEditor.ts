import AdmZip from "adm-zip";
import { parse } from "./parser/ast.js";
import { serializeTopLevel } from "./parser/genericSerialize.js";
import { getStatusField, setStatusField } from "./parser/statusFields.js";

export interface SaveInfo {
  mp: string | null;
  sp: string | null;
  ap: string | null;
  rp: string | null;
  name: string | null;
  army: string | null;
  enemyArmy: string | null;
  difficulty: string | null;
  region: string | null;
  playedGames: string | null;
  wonGames: string | null;
  entries: string[]; // names of all files inside the .sav, for sanity display
}

const EDITABLE_FIELDS = ["mp", "sp", "ap", "rp"] as const;
export type EditableField = (typeof EDITABLE_FIELDS)[number];

function getStatusEntry(zip: AdmZip): { entryName: string; text: string } {
  const entry = zip.getEntries().find((e) => e.entryName === "status");
  if (!entry) throw new Error('No "status" file found inside this .sav - is it a valid save?');
  return { entryName: entry.entryName, text: entry.getData().toString("utf-8") };
}

export function inspectSave(buffer: Buffer): SaveInfo {
  const zip = new AdmZip(buffer);
  const { text } = getStatusEntry(zip);
  const ast = parse(text);

  return {
    mp: getStatusField(ast, "mp"),
    sp: getStatusField(ast, "sp"),
    ap: getStatusField(ast, "ap"),
    rp: getStatusField(ast, "rp"),
    name: getStatusField(ast, "name"),
    army: getStatusField(ast, "army"),
    enemyArmy: getStatusField(ast, "enemyArmy"),
    difficulty: getStatusField(ast, "difficulty"),
    region: getStatusField(ast, "region"),
    playedGames: getStatusField(ast, "playedGames"),
    wonGames: getStatusField(ast, "wonGames"),
    entries: zip.getEntries().map((e) => e.entryName),
  };
}

// Applies edits to mp/sp/ap/rp and returns a new .sav buffer with every
// other entry (campaign.scn, map point files, screenshot, etc.) copied
// through byte-for-byte untouched.
export function editSave(buffer: Buffer, edits: Partial<Record<EditableField, string>>): Buffer {
  const zip = new AdmZip(buffer);
  const { text } = getStatusEntry(zip);
  let ast = parse(text);

  for (const [key, value] of Object.entries(edits)) {
    if (value === undefined) continue;
    if (!(EDITABLE_FIELDS as readonly string[]).includes(key)) {
      throw new Error(`Field "${key}" is not editable`);
    }
    ast = setStatusField(ast, key, value);
  }

  const newStatusText = serializeTopLevel(ast);

  const outZip = new AdmZip();
  for (const entry of zip.getEntries()) {
    if (entry.entryName === "status") {
      outZip.addFile("status", Buffer.from(newStatusText, "utf-8"));
    } else {
      outZip.addFile(entry.entryName, entry.getData());
    }
  }

  return outZip.toBuffer();
}
