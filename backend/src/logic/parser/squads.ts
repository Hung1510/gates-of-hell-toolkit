import { Node } from "./ast.js";
import { parseCall } from "./calls.js";

export interface SquadSlot {
  slot: string; // c1, c2, crew1, crew2, ...
  unitType: string; // e.g. "rifleman_1"
  count: number;
}

export interface Squad {
  template: string; // e.g. "squad_with3types_conquest", "squad_vehicle4"
  name: string; // e.g. "squad_officer_con" - the buildable squad's id
  displayName: string | null; // from the game's own .pot localization files, null if not found
  side: string | null;
  period: string | null;
  minStage: number | null;
  maxStage: number | null;
  vehicle: string | null; // for vehicle-crewed squads
  vehicleDisplayName: string | null; // from the game's own .pot localization files, null if not found
  slots: SquadSlot[];
  wrapperName: string | null; // if wrapped in {"name" (...)} , that name
}

function toInt(v: string | undefined): number | null {
  if (v === undefined || v === "") return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}

function extractSlots(args: Record<string, string>): SquadSlot[] {
  const slots: SquadSlot[] = [];
  for (const [key, value] of Object.entries(args)) {
    if (/^(c\d+|crew\d+)$/.test(key)) {
      const [unitType, countStr] = value.split(":");
      slots.push({ slot: key, unitType, count: parseInt(countStr ?? "1", 10) || 1 });
    }
  }
  return slots;
}

function squadFromCallNode(node: Node, wrapperName: string | null): Squad | null {
  const call = parseCall(node);
  if (!call || !call.head) return null;
  const a = call.args;
  return {
    template: call.head,
    name: a.name ?? wrapperName ?? call.head,
    displayName: null, // enriched later in loader.ts using real localization data
    side: a.side ?? null,
    period: a.period ?? null,
    minStage: toInt(a.min_stage),
    maxStage: toInt(a.max_stage),
    vehicle: a.vehicle ?? null,
    vehicleDisplayName: null, // enriched later in loader.ts
    slots: extractSlots(a),
    wrapperName,
  };
}

// Top-level nodes in units_*.set are either:
//   ("template" ...)                         -> direct squad call
//   {"wrapper_name" ("template" ...) }        -> named wrapper around a call
//     (used for single-vehicle squads where the squad id isn't in name())
export function extractSquads(topLevel: Node[]): Squad[] {
  const squads: Squad[] = [];

  for (const node of topLevel) {
    if (node.kind !== "list") continue;

    if (node.bracket === "(") {
      const squad = squadFromCallNode(node, null);
      if (squad) squads.push(squad);
      continue;
    }

    if (node.bracket === "{") {
      // Expect: [string wrapperName, list call, ...]
      let wrapperName: string | null = null;
      for (const child of node.items) {
        if (child.kind === "string" && wrapperName === null) {
          wrapperName = child.value;
          continue;
        }
        if (child.kind === "list" && child.bracket === "(") {
          const squad = squadFromCallNode(child, wrapperName);
          if (squad) squads.push(squad);
        }
      }
    }
  }

  return squads;
}
