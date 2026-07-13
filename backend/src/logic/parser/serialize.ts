import type { Squad, SquadSlot } from "./squads.js";
import type { TechNode } from "./techtree.js";

function slotsToSet(slots: SquadSlot[]): string {
  return slots.map((s) => `${s.slot}(${s.unitType}:${s.count})`).join(" ");
}

// Inverse of extractSquads(). Two shapes, matching what the parser recognizes:
//   - plain call:    ("template" side(x) period(y) min_stage(n) max_stage(n) name(id) c1(unit:n) ...)
//   - vehicle/wrapped: {"wrapper_name" ("template" side(x) ... vehicle(v) crew1(unit:n) ...) }
export function serializeSquad(squad: Squad): string {
  const parts: string[] = [];
  if (squad.side) parts.push(`side(${squad.side})`);
  if (squad.period) parts.push(`period(${squad.period})`);
  if (squad.minStage !== null) parts.push(`min_stage(${squad.minStage})`);
  if (squad.maxStage !== null) parts.push(`max_stage(${squad.maxStage})`);

  const isVehicle = squad.vehicle !== null || squad.wrapperName !== null;

  if (isVehicle) {
    // vehicle squads use cw/cp (crew weight/point cost placeholders) before vehicle()
    parts.push(`cw(0)`, `cp(0)`);
    if (squad.vehicle) parts.push(`vehicle(${squad.vehicle})`);
    parts.push(slotsToSet(squad.slots));
    const call = `("${squad.template}" ${parts.join(" ")})`;
    const wrapperName = squad.wrapperName ?? squad.name;
    return `{"${wrapperName}"\n\t${call}\n}`;
  }

  parts.push(`name(${squad.name})`);
  parts.push(slotsToSet(squad.slots));
  return `("${squad.template}" ${parts.join(" ")})`;
}

// Inverse of extractTechTree(). Matches both observed shapes:
//   { tech "id" requires "a b" costs N position x y }
//   {"id" requires "a b" costs N position x y}
export function serializeTechNode(node: TechNode): string {
  const bits: string[] = [];
  if (node.isTechUpgrade) bits.push("tech");
  bits.push(`"${node.id}"`);
  if (node.requires.length > 0) {
    bits.push(`requires "${node.requires.join(" ")}"`);
  }
  bits.push(`costs ${node.cost}`);
  bits.push(`position ${node.position.x} ${node.position.y}`);
  return `{${bits.join(" ")}}`;
}
