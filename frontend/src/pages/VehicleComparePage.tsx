import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { VehicleSelector } from "../components/VehicleSelector";
import { getVehicleFactions } from "../api";
import { getEffectiveArmor, classifyPenetration, resultLabel, FrontArmor, ArmorFacing } from "../lib/armor";
import type { Vehicle, VehicleFactionSummary } from "../types";

function PenetrationRows({ attacker, defenderArmor }: { attacker: Vehicle | null; defenderArmor: FrontArmor | null }) {
  if (!attacker?.gunStats || attacker.gunStats.shells.length === 0) {
    return (
      <tr>
        <td colSpan={4}>No resolved gun data for {attacker?.id ?? "this vehicle"}.</td>
      </tr>
    );
  }
  if (!defenderArmor) {
    return (
      <tr>
        <td colSpan={4}>No armor data for the opposing vehicle - can't compare.</td>
      </tr>
    );
  }

  const rows: JSX.Element[] = [];
  for (const shell of attacker.gunStats.shells) {
    if (!shell.penetrationTable) continue;
    for (const point of [...shell.penetrationTable].sort((a, b) => a.rangeM - b.rangeM)) {
      const result = classifyPenetration(point.penetrationMm, defenderArmor.mm);
      rows.push(
        <tr key={`${shell.shellType}-${point.rangeM}`}>
          <td>{shell.shellType}</td>
          <td>{point.rangeM}m</td>
          <td>{point.penetrationMm.toFixed(0)}mm</td>
          <td className={`pen-${result}`}>{resultLabel(result)}</td>
        </tr>
      );
    }
  }
  return <>{rows}</>;
}

export function VehicleComparePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [factionSummaries, setFactionSummaries] = useState<VehicleFactionSummary[]>([]);
  const [aFaction, setAFaction] = useState(searchParams.get("af") ?? "rus");
  const [aId, setAId] = useState(searchParams.get("ai") ?? "su85");
  const [bFaction, setBFaction] = useState(searchParams.get("bf") ?? "ger");
  const [bId, setBId] = useState(searchParams.get("bi") ?? "tiger1h");
  const [aVehicle, setAVehicle] = useState<Vehicle | null>(null);
  const [bVehicle, setBVehicle] = useState<Vehicle | null>(null);
  const [facing, setFacing] = useState<ArmorFacing>((searchParams.get("facing") as ArmorFacing) ?? "front");

  useEffect(() => {
    setSearchParams({ af: aFaction, ai: aId, bf: bFaction, bi: bId, facing }, { replace: true });
  }, [aFaction, aId, bFaction, bId, facing, setSearchParams]);

  useEffect(() => {
    getVehicleFactions().then(setFactionSummaries);
  }, []);

  const aArmor = useMemo(() => getEffectiveArmor(aVehicle, facing), [aVehicle, facing]);
  const bArmor = useMemo(() => getEffectiveArmor(bVehicle, facing), [bVehicle, facing]);

  return (
    <div className="vehicle-compare-page">
      <p className="disclaimer">
        "Effective armor" is a simplification: the thickest explicit facing-specific value
        among a vehicle's armor volumes, or - if none are explicitly marked for that facing -
        the thickest base value across all volumes (marked "fallback" below, since that's a
        real approximation, not the verified plate for that facing). Only Front and Rear are
        offered here: checked the real data first and found zero vehicles across any faction
        have an explicit Side armor value, so a "Side" option would always silently show the
        same generic fallback number rather than real distinct data - not offered as a choice
        to avoid implying precision that isn't there. Penetration values come from the game's
        own resolved formulas (verified against real weapon files - see the Vehicles tab).
        Results use four tiers based on the penetration-to-armor ratio: Overmatch (≥1.5x,
        effectively guaranteed regardless of angle), Penetrates (≥1x), Marginal (0.8-1x,
        plausible with a favorable angle or hit location), Bounces (&lt;0.8x). These
        thresholds are a reasonable heuristic, not the game's own exact RNG/angle formula,
        which isn't exposed in these files.
      </p>

      <div className="controls">
        <label>
          Compare facing:{" "}
          <select value={facing} onChange={(e) => setFacing(e.target.value as ArmorFacing)}>
            <option value="front">Front</option>
            <option value="rear">Rear</option>
          </select>
        </label>
      </div>

      <div className="compare-selectors">
        <VehicleSelector
          label="Vehicle A (attacker)"
          faction={aFaction}
          vehicleId={aId}
          factionSummaries={factionSummaries}
          onFactionChange={setAFaction}
          onVehicleChange={setAId}
          onVehicleLoaded={setAVehicle}
        />
        <VehicleSelector
          label="Vehicle B (defender)"
          faction={bFaction}
          vehicleId={bId}
          factionSummaries={factionSummaries}
          onFactionChange={setBFaction}
          onVehicleChange={setBId}
          onVehicleLoaded={setBVehicle}
        />
      </div>

      <button
        className="generate-btn"
        onClick={() => navigator.clipboard.writeText(window.location.href)}
      >
        Copy share link
      </button>

      <div className="armor-summary">
        <div>
          <strong>{aVehicle?.id ?? "-"}</strong> effective {facing} armor:{" "}
          {aArmor ? `${aArmor.mm}mm (${aArmor.source})` : "unknown"}
        </div>
        <div>
          <strong>{bVehicle?.id ?? "-"}</strong> effective {facing} armor:{" "}
          {bArmor ? `${bArmor.mm}mm (${bArmor.source})` : "unknown"}
        </div>
      </div>

      <h4>{aVehicle?.id ?? "A"}'s gun vs {bVehicle?.id ?? "B"}'s {facing} armor</h4>
      <table className="vehicle-table">
        <thead>
          <tr>
            <th>Ammo</th>
            <th>Range</th>
            <th>Penetration</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          <PenetrationRows attacker={aVehicle} defenderArmor={bArmor} />
        </tbody>
      </table>

      <h4>{bVehicle?.id ?? "B"}'s gun vs {aVehicle?.id ?? "A"}'s {facing} armor</h4>
      <table className="vehicle-table">
        <thead>
          <tr>
            <th>Ammo</th>
            <th>Range</th>
            <th>Penetration</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          <PenetrationRows attacker={bVehicle} defenderArmor={aArmor} />
        </tbody>
      </table>
    </div>
  );
}
