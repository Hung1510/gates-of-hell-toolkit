import type { Squad, TechNode, FactionSummary, SquadTemplate, BuildResult, CompareEntry, UnitCostEntry, ValidationWarning, Vehicle, VehicleFactionSummary, UnitWeaponInfo } from "./types";

// In dev, Vite proxies /api to the backend (see vite.config.ts).
// In production, set VITE_API_BASE to the deployed backend URL.
const API_BASE = import.meta.env.VITE_API_BASE ?? "";

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`Request failed: ${path} (${res.status})`);
  }
  return res.json();
}

async function postJSON<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error ?? `Request failed: ${path} (${res.status})`);
  }
  return data;
}

export function getFactions(): Promise<FactionSummary[]> {
  return getJSON("/api/factions");
}

export function getSquads(faction?: string): Promise<Squad[]> {
  const qs = faction ? `?faction=${encodeURIComponent(faction)}` : "";
  return getJSON(`/api/squads${qs}`);
}

export function getTechTree(faction: string): Promise<TechNode[]> {
  return getJSON(`/api/techtree?faction=${encodeURIComponent(faction)}`);
}

export function getTemplates(faction: string): Promise<SquadTemplate[]> {
  return getJSON(`/api/templates?faction=${encodeURIComponent(faction)}`);
}

export function getUnits(faction: string): Promise<string[]> {
  return getJSON(`/api/units?faction=${encodeURIComponent(faction)}`);
}

export function getUnitCosts(faction: string): Promise<UnitCostEntry[]> {
  return getJSON(`/api/units/costs?faction=${encodeURIComponent(faction)}`);
}

export function buildSquad(squad: Squad): Promise<BuildResult<Squad>> {
  return postJSON("/api/build/squad", squad);
}

export function buildTechNode(node: TechNode): Promise<BuildResult<TechNode>> {
  return postJSON("/api/build/technode", node);
}

export function compareSquads(aFaction: string, aName: string, bFaction: string, bName: string): Promise<CompareEntry[]> {
  const a = encodeURIComponent(`${aFaction}:${aName}`);
  const b = encodeURIComponent(`${bFaction}:${bName}`);
  return getJSON(`/api/compare?a=${a}&b=${b}`);
}

export function validateTechNode(faction: string, node: TechNode): Promise<{ warnings: ValidationWarning[] }> {
  return postJSON("/api/techtree/validate", { faction, node });
}

export function getVehicles(faction: string): Promise<Vehicle[]> {
  return getJSON(`/api/vehicles?faction=${encodeURIComponent(faction)}`);
}

export function getVehicleFactions(): Promise<VehicleFactionSummary[]> {
  return getJSON("/api/vehicles/factions");
}

export function getUnitWeapons(faction: string): Promise<UnitWeaponInfo[]> {
  return getJSON(`/api/units/weapons?faction=${encodeURIComponent(faction)}`);
}
