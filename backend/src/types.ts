export interface SquadSlot {
  slot: string;
  unitType: string;
  count: number;
}

export interface Squad {
  template: string;
  name: string;
  displayName: string | null;
  side: string | null;
  period: string | null;
  minStage: number | null;
  maxStage: number | null;
  vehicle: string | null;
  vehicleDisplayName: string | null;
  slots: SquadSlot[];
  wrapperName: string | null;
}

export interface TechNode {
  id: string;
  displayName: string | null;
  requires: string[];
  cost: number;
  position: { x: number; y: number };
  isTechUpgrade: boolean;
}

export type Faction = "ger" | "rus" | "usa" | "eng" | "fin";
