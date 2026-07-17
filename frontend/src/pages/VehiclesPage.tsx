import { Fragment, useEffect, useMemo, useState } from "react";
import { getVehicles, getVehicleFactions } from "../api";
import { FavoriteStar } from "../components/FavoriteStar";
import { TableSkeleton } from "../components/TableSkeleton";
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getVehicleFactions().then(setFactionSummaries);
  }, []);

  useEffect(() => {
    setLoading(true);
    getVehicles(faction)
      .then(setVehicles)
      .finally(() => setLoading(false));
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
        files (verified by hand against known SU-85 and M26 Pershing specs before trusting this).
        Gun penetration/damage per ammo type is now resolved too, via the game's own macro/template
        system (verified against the SU-85's real 85mm gun data before shipping) - click a vehicle
        to see it. Coverage varies: not every vehicle has a resolvable gun (many are cars/trailers/
        planes without cannon-type weapons). The "weapon" list can include non-combat slots (vision
        systems, searchlights) alongside the actual gun; "primary weapon" is a best-effort guess,
        not a verified classification.
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

      {loading ? (
        <TableSkeleton columns={6} />
      ) : (
      <table className="vehicle-table">
        <thead>
          <tr>
            <th scope="col" aria-label="Favorite"></th>
            <th scope="col">Id</th>
            <th scope="col">Category</th>
            <th scope="col">Primary weapon</th>
            <th scope="col">Mass (kg)</th>
            <th scope="col">Speed (km/h)</th>
            <th scope="col">Strongest armor (mm)</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((v) => (
            <Fragment key={v.id}>
              <tr
                onClick={() => setExpanded(expanded === v.id ? null : v.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setExpanded(expanded === v.id ? null : v.id);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-expanded={expanded === v.id}
                style={{ cursor: "pointer" }}
              >
                <td>
                  <FavoriteStar kind="vehicle" faction={v.faction} id={v.id} label={v.id} />
                </td>
                <td>{v.id}</td>
                <td>{v.category}</td>
                <td>{v.primaryWeapon ?? "-"}</td>
                <td>{v.mass ?? "-"}</td>
                <td>{v.mobility?.speed ?? "-"}</td>
                <td>{formatArmor(v)}</td>
              </tr>
              {expanded === v.id && (
                <tr>
                  <td colSpan={7}>
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
                      {v.gunStats && v.gunStats.shells.length > 0 && (
                        <div className="gun-stats">
                          <strong>Gun penetration (mm) by ammo type:</strong>
                          <table className="armor-detail-table">
                            <thead>
                              <tr>
                                <th>Shell</th>
                                <th>Damage vs armor</th>
                                {v.gunStats.shells[0].penetrationTable?.map((p) => (
                                  <th key={p.rangeM}>{p.rangeM}m</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {v.gunStats.shells.map((shell) => (
                                <tr key={shell.shellType}>
                                  <td>{shell.shellType}</td>
                                  <td>{shell.damage != null ? shell.damage.toFixed(0) : "-"}</td>
                                  {shell.penetrationTable?.map((p) => (
                                    <td key={p.rangeM}>{p.penetrationMm.toFixed(0)}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <p className="gun-stats-note">
                            Estimate only - verified against the game's own resolved values for a
                            handful of real weapons before shipping, but not exhaustively checked
                            against every gun. Penetration curves come from the game's own formulas.
                          </p>
                        </div>
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
      )}
    </div>
  );
}
