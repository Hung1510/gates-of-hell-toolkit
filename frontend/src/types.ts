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

export interface ArmorVolume {
  name: string;
  baseThickness: number;
  facings: Partial<Record<"front" | "rear" | "top" | "bottom" | "side", number>>;
  highHardness: boolean;
  castSteel: number | null;
}

export interface VehicleMobility {
  speed: number | null;
  weight: number | null;
  power: number | null;
  range: number | null;
}

export interface ShellStats {
  shellType: string;
  damage: number | null;
  penetrationTable: { rangeM: number; penetrationMm: number }[] | null;
}

export interface ResolvedWeaponStats {
  damage: number | null;
  damageTarget: "human" | "armor" | null;
  rpm: number | null;
  penetrationTable: { rangeM: number; penetrationMm: number }[] | null;
  calibre: number | null;
  velocity: number | null;
  shells: ShellStats[];
  unresolvedTemplates: string[];
}

export interface Vehicle {
  id: string;
  faction: string;
  category: string;
  weapons: string[];
  primaryWeapon: string | null;
  gunStats: ResolvedWeaponStats | null;
  mass: number | null;
  targetClass: string | null;
  mobility: VehicleMobility | null;
  armor: ArmorVolume[];
}

export interface UnitWeaponInfo {
  unitId: string;
  faction: string;
  period: string;
  primaryWeapon: string | null;
  weaponStats: ResolvedWeaponStats | null;
}

export interface BrowsableWeapon {
  id: string;
  category: string;
  stats: ResolvedWeaponStats;
}

export interface VehicleFactionSummary {
  faction: string;
  count: number;
  withArmor: number;
  withWeapon: number;
}
