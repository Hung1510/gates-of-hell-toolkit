import { Fragment, useEffect, useMemo, useState } from "react";
import { getVehicles, getVehicleFactions } from "../api";
import type { Vehicle, VehicleFactionSummary } from "../types";

function formatArmor(v: Vehicle): string {
  if (v.armor.length === 0) return "no armor data";
  const sorted = [...v.armor].sort((a, b) => b.baseThickness - a.baseThickness);
  return sorted
    .slice(0, 3)
    .map((a) => `${a.name}:${a.baseThickness}${a.facings.front ? `(front ${a.facings.front})` : ""}`)
    .join(", ");
}

export function VehiclesPage() {
  const [factionSummaries, setFactionSummaries] = useState<VehicleFactionSummary[]>([]);
  const [faction, setFaction] = useState("rus");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    getVehicleFactions().then(setFactionSummaries);
  }, []);

  useEffect(() => {
    getVehicles(faction).then(setVehicles);
    setExpanded(null);
  }, [faction]);

  const categories = useMemo(() => [...new Set(vehicles.map((v) => v.category))].sort(), [vehicles]);

  const filtered = useMemo(() => {
    return vehicles.filter((v) => {
      if (category && v.category !== category) return false;
      if (query.trim() && !v.id.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [vehicles, query, category]);

  return (
    <div className="vehicles-page">
      <p className="disclaimer">
        Armor thickness values are real, literal numbers straight from the game's own vehicle
        files (verified by hand against known SU-85 specs before trusting this). Weapon
        penetration/damage numbers are NOT shown yet - that needs a separate macro-resolution
        engine still being built. The "weapon" list can include non-combat slots (vision
        systems, searchlights) alongside the actual gun; "primary weapon" is a best-effort
        guess, not a verified classification.
      </p>

      <div className="controls">
        <label>
          Faction:{" "}
          <select value={faction} onChange={(e) => setFaction(e.target.value)}>
            {factionSummaries.map((f) => (
              <option key={f.faction} value={f.faction}>
                {f.faction} ({f.count} vehicles, {f.withArmor} with armor data)
              </option>
            ))}
          </select>
        </label>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Search vehicle id..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <p>
        {filtered.length} of {vehicles.length} vehicles
      </p>

      <table className="vehicle-table">
        <thead>
          <tr>
            <th>Id</th>
            <th>Category</th>
            <th>Primary weapon</th>
            <th>Mass (kg)</th>
            <th>Speed (km/h)</th>
            <th>Strongest armor (mm)</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((v) => (
            <Fragment key={v.id}>
              <tr onClick={() => setExpanded(expanded === v.id ? null : v.id)} style={{ cursor: "pointer" }}>
                <td>{v.id}</td>
                <td>{v.category}</td>
                <td>{v.primaryWeapon ?? "-"}</td>
                <td>{v.mass ?? "-"}</td>
                <td>{v.mobility?.speed ?? "-"}</td>
                <td>{formatArmor(v)}</td>
              </tr>
              {expanded === v.id && (
                <tr>
                  <td colSpan={6}>
                    <div className="vehicle-detail">
                      <p>
                        <strong>All weapon slots:</strong> {v.weapons.join(", ") || "none"}
                      </p>
                      {v.mobility && (
                        <p>
                          <strong>Mobility:</strong> speed {v.mobility.speed} km/h, weight{" "}
                          {v.mobility.weight} t, power {v.mobility.power} hp, range {v.mobility.range} km
                        </p>
                      )}
                      <table className="armor-detail-table">
                        <thead>
                          <tr>
                            <th>Volume</th>
                            <th>Base</th>
                            <th>Front</th>
                            <th>Rear</th>
                            <th>Top</th>
                            <th>Bottom</th>
                            <th>Side</th>
                            <th>Hardened</th>
                          </tr>
                        </thead>
                        <tbody>
                          {v.armor.map((a) => (
                            <tr key={a.name}>
                              <td>{a.name}</td>
                              <td>{a.baseThickness}</td>
                              <td>{a.facings.front ?? "-"}</td>
                              <td>{a.facings.rear ?? "-"}</td>
                              <td>{a.facings.top ?? "-"}</td>
                              <td>{a.facings.bottom ?? "-"}</td>
                              <td>{a.facings.side ?? "-"}</td>
                              <td>{a.highHardness ? "yes" : "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
