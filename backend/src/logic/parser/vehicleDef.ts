import { Node } from "./ast.js";
import { findAllByHead, findAllByHeadString, wordValue, numberValue } from "./treeWalk.js";

export interface VehicleDef {
  weapons: string[]; // weapon item ids, e.g. ["85mm_d5s"] - main gun first, then secondaries (mgs)
  mass: number | null; // kg, from top-level {mass N}
  targetClass: string | null; // e.g. "tank_medium", "car"
  mobility: {
    speed: number | null; // km/h
    weight: number | null; // tonnes (separate field from mass, seen in Chassis mobility calls)
    power: number | null; // hp
    range: number | null; // km
  } | null;
}

// .def files are a single top-level {game_entity ...} block, but the fields
// we need are nested at wildly different depths depending on vehicle type
// (tanks nest {weapon} inside {Weaponry {place "gun" {weapon ...}}}, cars/
// cannons may have it more shallowly) - findAllByHead searches the whole
// tree rather than assuming a fixed path.
export function extractVehicleDef(topLevel: Node[]): VehicleDef {
  const weaponNodes = findAllByHead(topLevel, "weapon");
  const weapons: string[] = [];
  for (const node of weaponNodes) {
    if (node.kind !== "list") continue;
    const id = wordValue(node.items[1]);
    // skip non-weapon uses of the word "weapon" that aren't actual gun ids,
    // e.g. some cosmetic/animation references reuse common words - a real
    // weapon id is always a quoted string in position 1
    if (id && node.items[1]?.kind === "string") weapons.push(id);
  }

  const massNodes = findAllByHead(topLevel, "mass");
  const mass = massNodes.length > 0 ? numberValue((massNodes[0] as any).items[1]) : null;

  const targetClassNodes = findAllByHead(topLevel, "targetclass");
  const targetClass = targetClassNodes.length > 0 ? wordValue((targetClassNodes[0] as any).items[1]) : null;

  // mobility comes from a template-style call like ("mobility_tank" speed(55) weight(29.6) power(500) range(210) ...)
  const mobilityCandidates = [
    ...findAllByHeadString(topLevel, "mobility_tank"),
    ...findAllByHeadString(topLevel, "mobility_cannon"),
    ...findAllByHeadString(topLevel, "mobility_car"),
    ...findAllByHeadString(topLevel, "mobility_plane"),
  ];

  let mobility: VehicleDef["mobility"] = null;
  if (mobilityCandidates.length > 0) {
    const node = mobilityCandidates[0];
    if (node.kind === "list") {
      const fields: Record<string, number | null> = { speed: null, weight: null, power: null, range: null };
      for (const item of node.items.slice(1)) {
        if (item.kind !== "word") continue;
        // keyword(value) pairs appear as adjacent word+list, same pattern as squads
      }
      // args appear as word key followed by a list containing the value
      for (let i = 1; i < node.items.length; i++) {
        const key = node.items[i];
        const next = node.items[i + 1];
        if (key.kind === "word" && next?.kind === "list" && next.items.length === 1) {
          const val = numberValue(next.items[0]);
          if (key.value in fields) fields[key.value] = val;
        }
      }
      mobility = { speed: fields.speed, weight: fields.weight, power: fields.power, range: fields.range };
    }
  }

  return { weapons, mass, targetClass, mobility };
}
