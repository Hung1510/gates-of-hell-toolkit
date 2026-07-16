import { useEffect, useState } from "react";
import type { Squad } from "../types";
import { getSquads } from "../api";
import { FactionBadge } from "./FactionBadge";

interface Props {
  label: string;
  faction: string;
  squadName: string;
  onFactionChange: (f: string) => void;
  onSquadChange: (n: string) => void;
}

const FACTIONS = [
  { value: "ger", label: "German" },
  { value: "rus", label: "Soviet" },
  { value: "usa", label: "USA" },
  { value: "eng", label: "British/Commonwealth" },
  { value: "fin", label: "Finnish" },
];

export function SquadSelector({ label, faction, squadName, onFactionChange, onSquadChange }: Props) {
  const [squads, setSquads] = useState<Squad[]>([]);

  useEffect(() => {
    getSquads(faction).then((data) => {
      setSquads(data);
      if (data.length > 0 && !data.some((s) => s.name === squadName)) {
        onSquadChange(data[0].name);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faction]);

  return (
    <div className="squad-selector">
      <h4>{label} <FactionBadge faction={faction} size="md" /></h4>
      <label>
        Faction
        <select value={faction} onChange={(e) => onFactionChange(e.target.value)}>
          {FACTIONS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Squad
        <select value={squadName} onChange={(e) => onSquadChange(e.target.value)}>
          {squads.map((s) => (
            <option key={s.name} value={s.name}>
              {s.displayName ? `${s.displayName} (${s.name})` : s.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
