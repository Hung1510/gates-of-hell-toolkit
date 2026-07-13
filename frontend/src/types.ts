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

export interface FactionSummary {
  faction: string;
  squadCount: number;
  techNodeCount: number;
}

export interface UnitCostEntry {
  id: string;
  displayName: string | null;
  fullPath: string;
  template: string;
  cost: number | null;
}

export interface SquadTemplate {
  template: string;
  slotKeys: string[];
  isVehicle: boolean;
  exampleCount: number;
}

export interface SquadStats {
  totalMen: number;
  totalCost: number | null;
  missingCostFor: string[];
  perSlot: { slot: string; unitType: string; count: number; unitCost: number | null; subtotal: number | null }[];
}

export interface ValidationWarning {
  severity: "error" | "warning";
  message: string;
}

export interface CompareEntry {
  faction: string;
  name: string;
  squad?: Squad;
  stats?: SquadStats;
  error?: string;
}

export interface BuildResult<T> {
  code: string;
  parsedBack: T;
}
