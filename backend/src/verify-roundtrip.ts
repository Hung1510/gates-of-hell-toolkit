import { loadAllFactions } from "./data/loader.js";
import { parse } from "./logic/parser/ast.js";
import { extractSquads } from "./logic/parser/squads.js";
import { extractTechTree } from "./logic/parser/techtree.js";
import { serializeSquad, serializeTechNode } from "./logic/parser/serialize.js";
import type { Squad } from "./logic/parser/squads.js";
import type { TechNode } from "./logic/parser/techtree.js";

function squadsEqual(a: Squad, b: Squad): string[] {
  const diffs: string[] = [];
  if (a.template !== b.template) diffs.push(`template: ${a.template} != ${b.template}`);
  if (a.name !== b.name) diffs.push(`name: ${a.name} != ${b.name}`);
  if (a.side !== b.side) diffs.push(`side: ${a.side} != ${b.side}`);
  if (a.period !== b.period) diffs.push(`period: ${a.period} != ${b.period}`);
  if (a.minStage !== b.minStage) diffs.push(`minStage: ${a.minStage} != ${b.minStage}`);
  if (a.maxStage !== b.maxStage) diffs.push(`maxStage: ${a.maxStage} != ${b.maxStage}`);
  if (a.vehicle !== b.vehicle) diffs.push(`vehicle: ${a.vehicle} != ${b.vehicle}`);
  const slotsA = JSON.stringify(a.slots);
  const slotsB = JSON.stringify(b.slots);
  if (slotsA !== slotsB) diffs.push(`slots: ${slotsA} != ${slotsB}`);
  return diffs;
}

function techEqual(a: TechNode, b: TechNode): string[] {
  const diffs: string[] = [];
  if (a.id !== b.id) diffs.push(`id: ${a.id} != ${b.id}`);
  if (a.cost !== b.cost) diffs.push(`cost: ${a.cost} != ${b.cost}`);
  if (a.isTechUpgrade !== b.isTechUpgrade) diffs.push(`isTechUpgrade mismatch`);
  if (JSON.stringify(a.requires) !== JSON.stringify(b.requires)) diffs.push(`requires mismatch`);
  if (a.position.x !== b.position.x || a.position.y !== b.position.y) diffs.push(`position mismatch`);
  return diffs;
}

const factions = loadAllFactions();
let totalSquadFail = 0;
let totalTechFail = 0;
let totalSquads = 0;
let totalTech = 0;

for (const f of factions) {
  for (const squad of f.squads) {
    totalSquads++;
    const text = serializeSquad(squad);
    const reparsed = extractSquads(parse(text));
    if (reparsed.length !== 1) {
      console.log(`[${f.faction}] FAIL reparse count for "${squad.name}": got ${reparsed.length}\n  text: ${text}`);
      totalSquadFail++;
      continue;
    }
    const diffs = squadsEqual(squad, reparsed[0]);
    if (diffs.length > 0) {
      console.log(`[${f.faction}] MISMATCH "${squad.name}": ${diffs.join(", ")}\n  text: ${text}`);
      totalSquadFail++;
    }
  }

  for (const node of f.techTree) {
    totalTech++;
    const text = serializeTechNode(node);
    const reparsed = extractTechTree(parse(text));
    if (reparsed.length !== 1) {
      console.log(`[${f.faction}] FAIL reparse count for tech "${node.id}": got ${reparsed.length}\n  text: ${text}`);
      totalTechFail++;
      continue;
    }
    const diffs = techEqual(node, reparsed[0]);
    if (diffs.length > 0) {
      console.log(`[${f.faction}] MISMATCH tech "${node.id}": ${diffs.join(", ")}\n  text: ${text}`);
      totalTechFail++;
    }
  }
}

console.log(`\n=== Round-trip results ===`);
console.log(`Squads: ${totalSquads - totalSquadFail}/${totalSquads} round-tripped cleanly`);
console.log(`Tech nodes: ${totalTech - totalTechFail}/${totalTech} round-tripped cleanly`);
if (totalSquadFail === 0 && totalTechFail === 0) {
  console.log(`ALL CLEAN`);
} else {
  process.exitCode = 1;
}
