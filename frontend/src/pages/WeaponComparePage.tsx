import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getWeapons } from "../api";
import type { BrowsableWeapon } from "../types";

function WeaponSelector({
  label,
  weapons,
  value,
  onChange,
}: {
  label: string;
  weapons: BrowsableWeapon[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="squad-selector">
      <h4>{label}</h4>
      <label>
        Weapon
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          {weapons.map((w) => (
            <option key={`${w.category}/${w.id}`} value={`${w.category}/${w.id}`}>
              {w.id} ({w.category})
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export function WeaponComparePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [weapons, setWeapons] = useState<BrowsableWeapon[]>([]);
  const [aKey, setAKey] = useState(searchParams.get("a") ?? "");
  const [bKey, setBKey] = useState(searchParams.get("b") ?? "");

  useEffect(() => {
    getWeapons().then((data) => {
      setWeapons(data);
      if (!aKey && data[0]) setAKey(`${data[0].category}/${data[0].id}`);
      if (!bKey && data[1]) setBKey(`${data[1].category}/${data[1].id}`);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (aKey && bKey) setSearchParams({ a: aKey, b: bKey }, { replace: true });
  }, [aKey, bKey, setSearchParams]);

  const a = useMemo(() => weapons.find((w) => `${w.category}/${w.id}` === aKey), [weapons, aKey]);
  const b = useMemo(() => weapons.find((w) => `${w.category}/${w.id}` === bKey), [weapons, bKey]);

  return (
    <div className="weapon-compare-page">
      <p className="disclaimer">
        Same resolved data as the Weapons Browser, side by side. Not every weapon has every
        stat resolved (e.g. per-shell penetration only applies to guns with multiple ammo
        types) - shown as "-" rather than a fabricated number.
      </p>

      <div className="compare-selectors">
        <WeaponSelector label="Weapon A" weapons={weapons} value={aKey} onChange={setAKey} />
        <WeaponSelector label="Weapon B" weapons={weapons} value={bKey} onChange={setBKey} />
      </div>

      <button className="generate-btn" onClick={() => navigator.clipboard.writeText(window.location.href)}>
        Copy share link
      </button>

      {a && b && (
        <table className="compare-table">
          <thead>
            <tr>
              <th>Stat</th>
              <th>
                <div className="display-name">{a.id}</div>
                <div className="internal-id">{a.category}</div>
              </th>
              <th>
                <div className="display-name">{b.id}</div>
                <div className="internal-id">{b.category}</div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Damage</td>
              <td>{a.stats.damage ?? "-"}</td>
              <td>{b.stats.damage ?? "-"}</td>
            </tr>
            <tr>
              <td>Damage target</td>
              <td>{a.stats.damageTarget ?? "-"}</td>
              <td>{b.stats.damageTarget ?? "-"}</td>
            </tr>
            <tr>
              <td>Fire rate (rpm)</td>
              <td>{a.stats.rpm ?? "-"}</td>
              <td>{b.stats.rpm ?? "-"}</td>
            </tr>
            <tr>
              <td>Calibre (mm)</td>
              <td>{a.stats.calibre ?? "-"}</td>
              <td>{b.stats.calibre ?? "-"}</td>
            </tr>
            <tr>
              <td>Velocity (m/s)</td>
              <td>{a.stats.velocity ?? "-"}</td>
              <td>{b.stats.velocity ?? "-"}</td>
            </tr>
            <tr>
              <td>Ammo types</td>
              <td>{a.stats.shells.map((s) => s.shellType).join(", ") || "-"}</td>
              <td>{b.stats.shells.map((s) => s.shellType).join(", ") || "-"}</td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}
