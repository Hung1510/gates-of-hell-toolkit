import type { Squad } from "../types";
import { FactionBadge } from "./FactionBadge";

interface Props {
  squads: Squad[];
  costById?: Map<string, number | null | undefined>;
}

function squadCost(slots: Squad["slots"], costById?: Map<string, number | null | undefined>): number | null {
  if (!costById) return null;
  let total = 0;
  for (const s of slots) {
    const c = costById.get(s.unitType);
    if (c === null || c === undefined) return null;
    total += c * s.count;
  }
  return total;
}

export function SquadTable({ squads, costById }: Props) {
  return (
    <table className="squad-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Template</th>
          <th>Side</th>
          <th>Period</th>
          <th>Stage</th>
          <th>Cost</th>
          <th>Composition</th>
        </tr>
      </thead>
      <tbody>
        {squads.map((s) => {
          const cost = squadCost(s.slots, costById);
          return (
            <tr key={s.name}>
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
