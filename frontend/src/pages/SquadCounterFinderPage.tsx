import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SquadSelector } from "../components/SquadSelector";
import { FactionBadge } from "../components/FactionBadge";
import { getSquads, getUnitCosts, getUnitWeapons } from "../api";
import { computeSquadDps } from "../lib/dps";
import { computeSquadCost } from "../lib/squadCost";
import type { Squad, UnitCostEntry, UnitWeaponInfo } from "../types";

const FACTIONS = ["ger", "rus", "usa", "eng", "fin"];

export function SquadCounterFinderPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [targetFaction, setTargetFaction] = useState(searchParams.get("tf") ?? "ger");
  const [targetName, setTargetName] = useState(searchParams.get("tn") ?? "squad_officer_con");
  const [targetSquad, setTargetSquad] = useState<Squad | null>(null);
  const [opposingFaction, setOpposingFaction] = useState(searchParams.get("of") ?? "rus");
  const [opposingSquads, setOpposingSquads] = useState<Squad[]>([]);
  const [opposingCosts, setOpposingCosts] = useState<UnitCostEntry[]>([]);
  const [opposingWeapons, setOpposingWeapons] = useState<UnitWeaponInfo[]>([]);
  const [targetCosts, setTargetCosts] = useState<UnitCostEntry[]>([]);
  const [targetWeapons, setTargetWeapons] = useState<UnitWeaponInfo[]>([]);

  useEffect(() => {
    setSearchParams({ tf: targetFaction, tn: targetName, of: opposingFaction }, { replace: true });
  }, [targetFaction, targetName, opposingFaction, setSearchParams]);

  useEffect(() => {
    getSquads(targetFaction).then((squads) => {
      const found = squads.find((s) => s.name === targetName);
      setTargetSquad(found ?? null);
    });
    getUnitCosts(targetFaction).then(setTargetCosts);
    getUnitWeapons(targetFaction).then(setTargetWeapons);
  }, [targetFaction, targetName]);

  useEffect(() => {
    getSquads(opposingFaction).then(setOpposingSquads);
    getUnitCosts(opposingFaction).then(setOpposingCosts);
    getUnitWeapons(opposingFaction).then(setOpposingWeapons);
  }, [opposingFaction]);

  const targetCostById = useMemo(() => new Map(targetCosts.map((c) => [c.id, c.cost])), [targetCosts]);
  const targetWeaponsByKey = useMemo(
    () => new Map(targetWeapons.map((w) => [`${w.unitId}:${w.period}`, w])),
    [targetWeapons]
  );
  const opposingCostById = useMemo(() => new Map(opposingCosts.map((c) => [c.id, c.cost])), [opposingCosts]);
  const opposingWeaponsByKey = useMemo(
    () => new Map(opposingWeapons.map((w) => [`${w.unitId}:${w.period}`, w])),
    [opposingWeapons]
  );

  const targetDps = useMemo(
    () => computeSquadDps(targetSquad?.slots, targetSquad?.period, targetWeaponsByKey),
    [targetSquad, targetWeaponsByKey]
  );
  const targetCost = useMemo(
    () => (targetSquad ? computeSquadCost(targetSquad.slots, targetCostById) : null),
    [targetSquad, targetCostById]
  );

  const ranked = useMemo(() => {
    return opposingSquads
      .map((s) => ({
        squad: s,
        dps: computeSquadDps(s.slots, s.period, opposingWeaponsByKey).dps,
        cost: computeSquadCost(s.slots, opposingCostById),
      }))
      .filter((r): r is { squad: Squad; dps: number; cost: number | null } => r.dps !== null)
      .sort((a, b) => b.dps - a.dps);
  }, [opposingSquads, opposingWeaponsByKey, opposingCostById]);

  return (
    <div className="squad-counter-page">
      <p className="disclaimer">
        Ranks every squad in the opposing faction by estimated DPS (same estimate as the
        Compare tab - continuous fire, no accuracy/cover/suppression modeled) against the
        target's own DPS and cost, shown as separate columns rather than one combined
        "best counter" score - DPS, cost, and DPS-per-cost each matter differently
        depending on what you're optimizing for, and collapsing them into a single ranking
        number would hide that tradeoff rather than help you see it. Squads with any
        unresolved unit weapon are excluded rather than shown with a misleading partial DPS.
      </p>

      <div className="compare-selectors">
        <SquadSelector
          label="Target squad"
          faction={targetFaction}
          squadName={targetName}
          onFactionChange={setTargetFaction}
          onSquadChange={setTargetName}
        />
        <div className="squad-selector">
          <h4>Opposing faction</h4>
          <label>
            Faction
            <select value={opposingFaction} onChange={(e) => setOpposingFaction(e.target.value)}>
              {FACTIONS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="armor-summary">
        <div>
          <strong>{targetSquad?.displayName ?? targetSquad?.name ?? "-"}</strong> DPS:{" "}
          {targetDps.dps !== null ? targetDps.dps.toFixed(1) : "unknown"}, Cost: {targetCost ?? "unknown"}
        </div>
        <div>{ranked.length} squads with resolved DPS found in {opposingFaction}</div>
      </div>

      <table className="squad-table">
        <thead>
          <tr>
            <th>Squad</th>
            <th>DPS</th>
            <th>Cost</th>
            <th>DPS per cost</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map(({ squad, dps, cost }) => (
            <tr key={squad.name}>
              <td>
                <div className="display-name">{squad.displayName ?? squad.name}</div>
                <div className="internal-id">
                  {squad.name} <FactionBadge faction={opposingFaction} />
                </div>
              </td>
              <td>{dps.toFixed(1)}</td>
              <td>{cost ?? "unknown"}</td>
              <td>{cost !== null && cost > 0 ? (dps / cost).toFixed(3) : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
