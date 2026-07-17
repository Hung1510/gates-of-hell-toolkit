import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SquadSelector } from "../components/SquadSelector";
import { FactionBadge } from "../components/FactionBadge";
import { compareSquads, getUnitWeapons } from "../api";
import { computeSquadDps } from "../lib/dps";
import type { CompareEntry, UnitWeaponInfo } from "../types";

function DpsBreakdownList({ breakdown }: { breakdown: ReturnType<typeof computeSquadDps>["breakdown"] }) {
  if (breakdown.length === 0) return <span className="internal-id">-</span>;
  return (
    <div className="dps-breakdown-list">
      {breakdown.map((b) => (
        <div key={b.unitType} className="internal-id">
          {b.unitType} ×{b.count}:{" "}
          {b.totalDps !== null ? `${b.totalDps.toFixed(1)} DPS (${b.damage}×${b.rpm}rpm)` : "unresolved"}
        </div>
      ))}
    </div>
  );
}

export function ComparePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [aFaction, setAFaction] = useState(searchParams.get("af") ?? "ger");
  const [aName, setAName] = useState(searchParams.get("an") ?? "squad_officer_con");
  const [bFaction, setBFaction] = useState(searchParams.get("bf") ?? "usa");
  const [bName, setBName] = useState(searchParams.get("bn") ?? "squad_officer_con");
  const [results, setResults] = useState<CompareEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aWeapons, setAWeapons] = useState<UnitWeaponInfo[]>([]);
  const [bWeapons, setBWeapons] = useState<UnitWeaponInfo[]>([]);
  const [showBreakdown, setShowBreakdown] = useState(false);

  // keep the URL in sync so the current comparison can be shared/bookmarked
  // directly (e.g. a link to "SU-85 vs Tiger" works without re-selecting)
  useEffect(() => {
    setSearchParams({ af: aFaction, an: aName, bf: bFaction, bn: bName }, { replace: true });
  }, [aFaction, aName, bFaction, bName, setSearchParams]);

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
        Cost and composition are pulled directly from real game data. DPS is estimated from
        real resolved weapon damage + fire rate (verified against known real-world weapon
        specs before trusting the resolver - see the About tab) - but it's an estimate, not
        shown by the game itself: it assumes every soldier fires continuously and ignores
        accuracy, cover, suppression, and range falloff. If any unit in a squad doesn't have
        a resolved weapon, DPS shows as unknown rather than a partial/misleading number.
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

      <button
        className="generate-btn"
        onClick={() => navigator.clipboard.writeText(window.location.href)}
      >
        Copy share link
      </button>

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
            <tr
              onClick={() => setShowBreakdown((s) => !s)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setShowBreakdown((s) => !s);
                }
              }}
              tabIndex={0}
              role="button"
              aria-expanded={showBreakdown}
              style={{ cursor: "pointer" }}
            >
              <td>Estimated DPS {showBreakdown ? "▾" : "▸"}</td>
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
            {showBreakdown && (
              <tr>
                <td className="internal-id" style={{ fontStyle: "italic" }}>
                  Per-unit
                </td>
                <td>
                  <DpsBreakdownList breakdown={leftDps.breakdown} />
                </td>
                <td>
                  <DpsBreakdownList breakdown={rightDps.breakdown} />
                </td>
              </tr>
            )}
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
