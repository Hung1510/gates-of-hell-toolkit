import { useEffect, useMemo, useState } from "react";
import { SquadSelector } from "../components/SquadSelector";
import { FactionBadge } from "../components/FactionBadge";
import { compareSquads, getUnitWeapons } from "../api";
import type { CompareEntry, UnitWeaponInfo } from "../types";

function computeSquadDps(
  slots: { unitType: string; count: number }[] | undefined,
  period: string | null | undefined,
  weaponsByKey: Map<string, UnitWeaponInfo>
): { dps: number | null; missingFor: string[] } {
  if (!slots || !period) return { dps: null, missingFor: [] };
  let total = 0;
  const missingFor: string[] = [];
  for (const s of slots) {
    const info = weaponsByKey.get(`${s.unitType}:${period}`);
    const damage = info?.weaponStats?.damage;
    const rpm = info?.weaponStats?.rpm;
    if (damage == null || rpm == null) {
      missingFor.push(s.unitType);
      continue;
    }
    total += s.count * damage * (rpm / 60);
  }
  return { dps: missingFor.length > 0 ? null : total, missingFor };
}

export function ComparePage() {
  const [aFaction, setAFaction] = useState("ger");
  const [aName, setAName] = useState("squad_officer_con");
  const [bFaction, setBFaction] = useState("usa");
  const [bName, setBName] = useState("squad_officer_con");
  const [results, setResults] = useState<CompareEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aWeapons, setAWeapons] = useState<UnitWeaponInfo[]>([]);
  const [bWeapons, setBWeapons] = useState<UnitWeaponInfo[]>([]);

  useEffect(() => {
    compareSquads(aFaction, aName, bFaction, bName)
      .then(setResults)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, [aFaction, aName, bFaction, bName]);

  useEffect(() => {
    getUnitWeapons(aFaction).then(setAWeapons);
  }, [aFaction]);
  useEffect(() => {
    getUnitWeapons(bFaction).then(setBWeapons);
  }, [bFaction]);

  const aWeaponsByKey = useMemo(() => new Map(aWeapons.map((w) => [`${w.unitId}:${w.period}`, w])), [aWeapons]);
  const bWeaponsByKey = useMemo(() => new Map(bWeapons.map((w) => [`${w.unitId}:${w.period}`, w])), [bWeapons]);

  const [left, right] = results ?? [undefined, undefined];

  const leftDps = useMemo(
    () => computeSquadDps(left?.squad?.slots, left?.squad?.period, aWeaponsByKey),
    [left, aWeaponsByKey]
  );
  const rightDps = useMemo(
    () => computeSquadDps(right?.squad?.slots, right?.squad?.period, bWeaponsByKey),
    [right, bWeaponsByKey]
  );

  return (
    <div className="compare-page">
      <p className="disclaimer">
        Cost and composition are pulled directly from real game data. DPS is now
        estimated from real resolved weapon damage + fire rate (verified against known
        real-world weapon specs before trusting the resolver - see the About tab) - but
        it's an estimate, not shown by the game itself: it assumes every soldier fires
        continuously and ignores accuracy, cover, suppression, and range falloff.
        Armor penetration comparison isn't wired in yet (that needs matching this DPS
        data against the Vehicles tab's armor data, still to come). If any unit in a
        squad doesn't have a resolved weapon, DPS shows as unknown rather than a
        partial/misleading number.
      </p>

      <div className="compare-selectors">
        <SquadSelector
          label="Squad A"
          faction={aFaction}
          squadName={aName}
          onFactionChange={setAFaction}
          onSquadChange={setAName}
        />
        <SquadSelector
          label="Squad B"
          faction={bFaction}
          squadName={bName}
          onFactionChange={setBFaction}
          onSquadChange={setBName}
        />
      </div>

      {error && <p className="error">{error}</p>}

      {left && right && (
        <table className="compare-table">
          <thead>
            <tr>
              <th>Stat</th>
              <th>
                <div className="display-name">{left.squad?.displayName ?? left.name}</div>
                <div className="internal-id">{left.name} <FactionBadge faction={left.faction} /></div>
              </th>
              <th>
                <div className="display-name">{right.squad?.displayName ?? right.name}</div>
                <div className="internal-id">{right.name} <FactionBadge faction={right.faction} /></div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Men</td>
              <td>{left.stats?.totalMen ?? "-"}</td>
              <td>{right.stats?.totalMen ?? "-"}</td>
            </tr>
            <tr>
              <td>Cost</td>
              <td>
                {left.stats?.totalCost ?? (
                  <span title={left.stats?.missingCostFor.join(", ")}>
                    unknown ({left.stats?.missingCostFor.length} unpriced unit type(s))
                  </span>
                )}
              </td>
              <td>
                {right.stats?.totalCost ?? (
                  <span title={right.stats?.missingCostFor.join(", ")}>
                    unknown ({right.stats?.missingCostFor.length} unpriced unit type(s))
                  </span>
                )}
              </td>
            </tr>
            <tr>
              <td>Cost per man</td>
              <td>
                {left.stats?.totalCost != null && left.stats.totalMen > 0
                  ? (left.stats.totalCost / left.stats.totalMen).toFixed(1)
                  : "-"}
              </td>
              <td>
                {right.stats?.totalCost != null && right.stats.totalMen > 0
                  ? (right.stats.totalCost / right.stats.totalMen).toFixed(1)
                  : "-"}
              </td>
            </tr>
            <tr>
              <td>Estimated DPS</td>
              <td>
                {leftDps.dps !== null ? (
                  leftDps.dps.toFixed(1)
                ) : (
                  <span title={leftDps.missingFor.join(", ")}>
                    unknown ({leftDps.missingFor.length} unresolved unit type(s))
                  </span>
                )}
              </td>
              <td>
                {rightDps.dps !== null ? (
                  rightDps.dps.toFixed(1)
                ) : (
                  <span title={rightDps.missingFor.join(", ")}>
                    unknown ({rightDps.missingFor.length} unresolved unit type(s))
                  </span>
                )}
              </td>
            </tr>
            <tr>
              <td>Composition</td>
              <td>
                {left.squad?.slots.map((s) => `${s.unitType}×${s.count}`).join(", ") ?? "-"}
              </td>
              <td>
                {right.squad?.slots.map((s) => `${s.unitType}×${s.count}`).join(", ") ?? "-"}
              </td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}
