import { useEffect, useState } from "react";
import type { Vehicle, VehicleFactionSummary } from "../types";
import { getVehicles } from "../api";
import { FactionBadge } from "./FactionBadge";

interface Props {
  label: string;
  faction: string;
  vehicleId: string;
  factionSummaries: VehicleFactionSummary[];
  onFactionChange: (f: string) => void;
  onVehicleChange: (id: string) => void;
  onVehicleLoaded: (v: Vehicle | null) => void;
}

export function VehicleSelector({
  label,
  faction,
  vehicleId,
  factionSummaries,
  onFactionChange,
  onVehicleChange,
  onVehicleLoaded,
}: Props) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  useEffect(() => {
    getVehicles(faction).then((data) => {
      setVehicles(data);
      if (data.length > 0 && !data.some((v) => v.id === vehicleId)) {
        onVehicleChange(data[0].id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faction]);

  useEffect(() => {
    const v = vehicles.find((v) => v.id === vehicleId) ?? null;
    onVehicleLoaded(v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicles, vehicleId]);

  return (
    <div className="squad-selector">
      <h4>{label} <FactionBadge faction={faction} size="md" /></h4>
      <label>
        Faction
        <select value={faction} onChange={(e) => onFactionChange(e.target.value)}>
          {factionSummaries.map((f) => (
            <option key={f.faction} value={f.faction}>
              {f.faction} ({f.count})
            </option>
          ))}
        </select>
      </label>
      <label>
        Vehicle
        <select value={vehicleId} onChange={(e) => onVehicleChange(e.target.value)}>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.id} ({v.category})
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
