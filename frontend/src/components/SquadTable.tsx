import type { Squad } from "../types";
import { FactionBadge } from "./FactionBadge";
import { FavoriteStar } from "./FavoriteStar";
import { computeSquadCost } from "../lib/squadCost";

interface Props {
  squads: Squad[];
  costById?: Map<string, number | null | undefined>;
}

export function SquadTable({ squads, costById }: Props) {
  return (
    <table className="squad-table">
      <thead>
        <tr>
          <th scope="col" aria-label="Favorite"></th>
          <th scope="col">Name</th>
          <th scope="col">Template</th>
          <th scope="col">Side</th>
          <th scope="col">Period</th>
          <th scope="col">Stage</th>
          <th scope="col">Cost</th>
          <th scope="col">Composition</th>
        </tr>
      </thead>
      <tbody>
        {squads.map((s) => {
          const cost = costById ? computeSquadCost(s.slots, costById) : null;
          return (
            <tr key={s.name}>
              <td>
                {s.side && (
                  <FavoriteStar kind="squad" faction={s.side} id={s.name} label={s.displayName ?? s.name} />
                )}
              </td>
              <td>
                {s.displayName ? (
                  <>
                    <div className="display-name">{s.displayName}</div>
                    <div className="internal-id">{s.name}</div>
                  </>
                ) : (
                  s.name
                )}
              </td>
              <td>{s.template}</td>
              <td>{s.side ? <FactionBadge faction={s.side} /> : "-"}</td>
              <td>{s.period ?? "-"}</td>
              <td>
                {s.minStage ?? "-"}–{s.maxStage ?? "-"}
              </td>
              <td>{cost ?? "-"}</td>
              <td>
                {s.vehicle && (
                  <span className="vehicle-tag">{s.vehicleDisplayName ?? s.vehicle}: </span>
                )}
                {s.slots.length === 0
                  ? "—"
                  : s.slots.map((slot) => `${slot.unitType}×${slot.count}`).join(", ")}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
