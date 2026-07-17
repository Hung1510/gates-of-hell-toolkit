import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { VehicleSelector } from "../components/VehicleSelector";
import { getVehicleFactions, getVehicles } from "../api";
import { getEffectiveArmor, bestShotAgainst, resultLabel, ArmorFacing } from "../lib/armor";
import type { Vehicle, VehicleFactionSummary } from "../types";

export function CounterFinderPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [factionSummaries, setFactionSummaries] = useState<VehicleFactionSummary[]>([]);
  const [targetFaction, setTargetFaction] = useState(searchParams.get("tf") ?? "ger");
  const [targetId, setTargetId] = useState(searchParams.get("ti") ?? "tiger1h");
  const [target, setTarget] = useState<Vehicle | null>(null);
  const [opposingFaction, setOpposingFaction] = useState(searchParams.get("of") ?? "rus");
  const [opposingVehicles, setOpposingVehicles] = useState<Vehicle[]>([]);
  const [facing, setFacing] = useState<ArmorFacing>((searchParams.get("facing") as ArmorFacing) ?? "front");

  useEffect(() => {
    setSearchParams({ tf: targetFaction, ti: targetId, of: opposingFaction, facing }, { replace: true });
  }, [targetFaction, targetId, opposingFaction, facing, setSearchParams]);

  useEffect(() => {
    getVehicleFactions().then(setFactionSummaries);
  }, []);

  useEffect(() => {
    getVehicles(opposingFaction).then(setOpposingVehicles);
  }, [opposingFaction]);

  const targetArmor = useMemo(() => getEffectiveArmor(target, facing), [target, facing]);

  const ranked = useMemo(() => {
    if (!targetArmor) return [];
    const results = opposingVehicles
      .map((v) => ({ vehicle: v, shot: bestShotAgainst(v, targetArmor.mm) }))
      .filter((r): r is { vehicle: Vehicle; shot: NonNullable<ReturnType<typeof bestShotAgainst>> } => r.shot !== null);
    return results.sort((a, b) => b.shot.penetrationMm - a.shot.penetrationMm);
  }, [opposingVehicles, targetArmor]);

  return (
    <div className="counter-finder-page">
      <p className="disclaimer">
        Ranks every vehicle in the opposing faction by their single best shot (best ammo
        type, at whichever range gives the highest penetration) against the target's
        effective armor for the selected facing - same simplification and tiers as the
        Armor vs Gun tab. Only Front and Rear are offered: checked the real data first and
        found zero vehicles have an explicit Side armor value, so it would always silently
        show the same generic fallback rather than real distinct data. Only lists vehicles
        with resolved gun data; vehicles without a usable gun (cars, trailers, unarmed
        transports) are silently excluded rather than shown as "no data".
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
          label="Target (defender)"
          faction={targetFaction}
          vehicleId={targetId}
          factionSummaries={factionSummaries}
          onFactionChange={setTargetFaction}
          onVehicleChange={setTargetId}
          onVehicleLoaded={setTarget}
        />
        <div className="squad-selector">
          <h4>Opposing faction (attackers)</h4>
          <label>
            Faction
            <select value={opposingFaction} onChange={(e) => setOpposingFaction(e.target.value)}>
              {factionSummaries.map((f) => (
                <option key={f.faction} value={f.faction}>
                  {f.faction} ({f.count})
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="armor-summary">
        <div>
          <strong>{target?.id ?? "-"}</strong> effective {facing} armor:{" "}
          {targetArmor ? `${targetArmor.mm}mm (${targetArmor.source})` : "unknown"}
        </div>
        <div>{ranked.length} vehicles with a resolved gun found in {opposingFaction}</div>
      </div>

      <table className="vehicle-table">
        <thead>
          <tr>
            <th>Vehicle</th>
            <th>Category</th>
            <th>Best ammo</th>
            <th>At range</th>
            <th>Penetration</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map(({ vehicle, shot }) => (
            <tr key={vehicle.id}>
              <td>{vehicle.id}</td>
              <td>{vehicle.category}</td>
              <td>{shot.shellType}</td>
              <td>{shot.rangeM}m</td>
              <td>{shot.penetrationMm.toFixed(0)}mm</td>
              <td className={`pen-${shot.result}`}>{resultLabel(shot.result)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
