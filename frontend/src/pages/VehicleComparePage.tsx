import { useEffect, useMemo, useState } from "react";
import { VehicleSelector } from "../components/VehicleSelector";
import { getVehicleFactions } from "../api";
import type { Vehicle, VehicleFactionSummary } from "../types";

interface FrontArmor {
  mm: number;
  source: "explicit" | "fallback";
}

// Volumes are named things like "body3"/"turret4", not literally "hull
// front" - so "effective frontal armor" is a deliberate simplification:
// the thickest value among any volume's explicit {front ...} override, or
// if a vehicle has none of those, the thickest base thickness across all
// its volumes (a real fallback, not a guess dressed up as fact - flagged
// as such in the UI).
function getEffectiveFrontArmor(vehicle: Vehicle | null): FrontArmor | null {
  if (!vehicle || vehicle.armor.length === 0) return null;
  const explicitFronts = vehicle.armor.map((a) => a.facings.front).filter((v): v is number => v !== undefined);
  if (explicitFronts.length > 0) {
    return { mm: Math.max(...explicitFronts), source: "explicit" };
  }
  return { mm: Math.max(...vehicle.armor.map((a) => a.baseThickness)), source: "fallback" };
}

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
      const canPenetrate = point.penetrationMm >= defenderArmor.mm;
      rows.push(
        <tr key={`${shell.shellType}-${point.rangeM}`}>
          <td>{shell.shellType}</td>
          <td>{point.rangeM}m</td>
          <td>{point.penetrationMm.toFixed(0)}mm</td>
          <td className={canPenetrate ? "pen-yes" : "pen-no"}>{canPenetrate ? "Penetrates" : "Bounces"}</td>
        </tr>
      );
    }
  }
  return <>{rows}</>;
}

export function VehicleComparePage() {
  const [factionSummaries, setFactionSummaries] = useState<VehicleFactionSummary[]>([]);
  const [aFaction, setAFaction] = useState("rus");
  const [aId, setAId] = useState("su85");
  const [bFaction, setBFaction] = useState("ger");
  const [bId, setBId] = useState("tiger1h");
  const [aVehicle, setAVehicle] = useState<Vehicle | null>(null);
  const [bVehicle, setBVehicle] = useState<Vehicle | null>(null);

  useEffect(() => {
    getVehicleFactions().then(setFactionSummaries);
  }, []);

  const aFrontArmor = useMemo(() => getEffectiveFrontArmor(aVehicle), [aVehicle]);
  const bFrontArmor = useMemo(() => getEffectiveFrontArmor(bVehicle), [bVehicle]);

  return (
    <div className="vehicle-compare-page">
      <p className="disclaimer">
        "Effective frontal armor" is a simplification: the thickest explicit front-facing
        value among a vehicle's armor volumes, or - if none are explicitly marked "front" -
        the thickest base value across all volumes (marked "fallback" below, since that's a
        real approximation, not the verified frontal plate). Penetration values come from
        the game's own resolved formulas (verified against real weapon files - see the
        Vehicles tab), compared directly against that single frontal number - real combat
        also depends on angle/slope, ammo choice, and exact impact location, none of which
        this accounts for.
      </p>

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

      <div className="armor-summary">
        <div>
          <strong>{aVehicle?.id ?? "-"}</strong> effective front armor:{" "}
          {aFrontArmor ? `${aFrontArmor.mm}mm (${aFrontArmor.source})` : "unknown"}
        </div>
        <div>
          <strong>{bVehicle?.id ?? "-"}</strong> effective front armor:{" "}
          {bFrontArmor ? `${bFrontArmor.mm}mm (${bFrontArmor.source})` : "unknown"}
        </div>
      </div>

      <h4>{aVehicle?.id ?? "A"}'s gun vs {bVehicle?.id ?? "B"}'s front armor</h4>
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
          <PenetrationRows attacker={aVehicle} defenderArmor={bFrontArmor} />
        </tbody>
      </table>

      <h4>{bVehicle?.id ?? "B"}'s gun vs {aVehicle?.id ?? "A"}'s front armor</h4>
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
          <PenetrationRows attacker={bVehicle} defenderArmor={aFrontArmor} />
        </tbody>
      </table>
    </div>
  );
}
