import { useEffect, useState } from "react";
import { SquadSelector } from "../components/SquadSelector";
import { compareSquads } from "../api";
import type { CompareEntry } from "../types";

export function ComparePage() {
  const [aFaction, setAFaction] = useState("ger");
  const [aName, setAName] = useState("squad_officer_con");
  const [bFaction, setBFaction] = useState("usa");
  const [bName, setBName] = useState("squad_officer_con");
  const [results, setResults] = useState<CompareEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    compareSquads(aFaction, aName, bFaction, bName)
      .then(setResults)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, [aFaction, aName, bFaction, bName]);

  const [left, right] = results ?? [undefined, undefined];

  return (
    <div className="compare-page">
      <p className="disclaimer">
        Cost and composition are pulled directly from real game data. DPS and armor
        penetration aren't shown — the game files link weapon stats to soldiers through
        a data source this toolkit doesn't have access to yet.
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
                <div className="internal-id">{left.name} ({left.faction})</div>
              </th>
              <th>
                <div className="display-name">{right.squad?.displayName ?? right.name}</div>
                <div className="internal-id">{right.name} ({right.faction})</div>
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
