import { useEffect, useMemo, useState } from "react";
import { getWeapons } from "../api";
import { TableSkeleton } from "../components/TableSkeleton";
import type { BrowsableWeapon } from "../types";

type SortKey = "id" | "damage" | "rpm" | "calibre" | "velocity";

export function WeaponsPage() {
  const [weapons, setWeapons] = useState<BrowsableWeapon[]>([]);
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("id");
  const [sortDesc, setSortDesc] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWeapons()
      .then(setWeapons)
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => [...new Set(weapons.map((w) => w.category))].sort(), [weapons]);

  const filtered = useMemo(() => {
    let list = weapons.filter((w) => {
      if (category && w.category !== category) return false;
      if (query.trim() && !w.id.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      let av: number | string;
      let bv: number | string;
      if (sortKey === "id") {
        av = a.id;
        bv = b.id;
      } else {
        av = a.stats[sortKey] ?? -Infinity;
        bv = b.stats[sortKey] ?? -Infinity;
      }
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDesc ? -cmp : cmp;
    });
    return list;
  }, [weapons, category, query, sortKey, sortDesc]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDesc((d) => !d);
    else {
      setSortKey(key);
      setSortDesc(key !== "id");
    }
  }

  function sortableHeaderProps(key: SortKey) {
    return {
      onClick: () => toggleSort(key),
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggleSort(key);
        }
      },
      tabIndex: 0,
      role: "button" as const,
      "aria-sort": (sortKey === key ? (sortDesc ? "descending" : "ascending") : "none") as
        | "descending"
        | "ascending"
        | "none",
      style: { cursor: "pointer" },
    };
  }

  return (
    <div className="weapons-page">
      <p className="disclaimer">
        Every weapon file across all categories that resolved to at least one real stat
        (damage, calibre, or a per-ammo-type curve) - the same resolver verified against
        K98k, Mosin, MG34, and the SU-85's 85mm gun (see the About tab). Not every single
        one of the {weapons.length} entries here has been individually hand-checked, so
        treat outliers as worth a second look rather than gospel.
      </p>

      <div className="controls">
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
          placeholder="Search weapon id..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <p>
        {filtered.length} of {weapons.length} weapons
      </p>

      {loading ? (
        <TableSkeleton columns={7} />
      ) : (
      <table className="squad-table">
        <thead>
          <tr>
            <th {...sortableHeaderProps("id")}>
              Id {sortKey === "id" ? (sortDesc ? "↓" : "↑") : ""}
            </th>
            <th>Category</th>
            <th {...sortableHeaderProps("damage")}>
              Damage {sortKey === "damage" ? (sortDesc ? "↓" : "↑") : ""}
            </th>
            <th {...sortableHeaderProps("rpm")}>
              RPM {sortKey === "rpm" ? (sortDesc ? "↓" : "↑") : ""}
            </th>
            <th {...sortableHeaderProps("calibre")}>
              Calibre {sortKey === "calibre" ? (sortDesc ? "↓" : "↑") : ""}
            </th>
            <th {...sortableHeaderProps("velocity")}>
              Velocity {sortKey === "velocity" ? (sortDesc ? "↓" : "↑") : ""}
            </th>
            <th>Ammo types</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((w) => (
            <tr key={`${w.category}/${w.id}`}>
              <td>{w.id}</td>
              <td>{w.category}</td>
              <td>{w.stats.damage ?? "-"}</td>
              <td>{w.stats.rpm ?? "-"}</td>
              <td>{w.stats.calibre ?? "-"}</td>
              <td>{w.stats.velocity ?? "-"}</td>
              <td>{w.stats.shells.length > 0 ? w.stats.shells.map((s) => s.shellType).join(", ") : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      )}
    </div>
  );
}
