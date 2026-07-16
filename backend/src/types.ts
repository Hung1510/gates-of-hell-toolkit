// Squad/SquadSlot and TechNode are defined once, in the parser modules that
// actually produce them (logic/parser/squads.ts, logic/parser/techtree.ts).
// This file re-exports them rather than duplicating the shape, so there's a
// single source of truth - a field added/changed in one place can't get out
// of sync with a forgotten duplicate elsewhere.
export type { Squad, SquadSlot } from "./logic/parser/squads.js";
export type { TechNode } from "./logic/parser/techtree.js";

export type Faction = "ger" | "rus" | "usa" | "eng" | "fin";
