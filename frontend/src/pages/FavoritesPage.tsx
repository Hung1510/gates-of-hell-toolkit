import { useNavigate } from "react-router-dom";
import { useFavorites } from "../hooks/useFavorites";
import { FactionBadge } from "../components/FactionBadge";

export function FavoritesPage() {
  const { favorites, removeFavorite } = useFavorites();
  const navigate = useNavigate();

  const squads = favorites.filter((f) => f.kind === "squad").sort((a, b) => b.addedAt - a.addedAt);
  const vehicles = favorites.filter((f) => f.kind === "vehicle").sort((a, b) => b.addedAt - a.addedAt);

  return (
    <div className="favorites-page">
      <p className="disclaimer">
        Saved locally in your browser (localStorage) - not synced to any account or server,
        and won't follow you to a different browser or device. Click the star icon on any
        squad (Browse tab) or vehicle (Vehicles tab) row to add or remove it here.
      </p>

      <h3>Squads</h3>
      {squads.length === 0 ? (
        <p className="internal-id">No favorite squads yet.</p>
      ) : (
        <table className="squad-table">
          <thead>
            <tr>
              <th scope="col">Squad</th>
              <th scope="col">Faction</th>
              <th scope="col"></th>
            </tr>
          </thead>
          <tbody>
            {squads.map((f) => (
              <tr key={`${f.kind}:${f.faction}:${f.id}`}>
                <td>{f.label}</td>
                <td>
                  <FactionBadge faction={f.faction} />
                </td>
                <td>
                  <button className="generate-btn" onClick={() => navigate("/browse")}>
                    View
                  </button>{" "}
                  <button className="generate-btn" onClick={() => removeFavorite(f.kind, f.faction, f.id)}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3>Vehicles</h3>
      {vehicles.length === 0 ? (
        <p className="internal-id">No favorite vehicles yet.</p>
      ) : (
        <table className="squad-table">
          <thead>
            <tr>
              <th scope="col">Vehicle</th>
              <th scope="col">Faction</th>
              <th scope="col"></th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((f) => (
              <tr key={`${f.kind}:${f.faction}:${f.id}`}>
                <td>{f.label}</td>
                <td>
                  <FactionBadge faction={f.faction} />
                </td>
                <td>
                  <button className="generate-btn" onClick={() => navigate("/vehicles")}>
                    View
                  </button>{" "}
                  <button className="generate-btn" onClick={() => removeFavorite(f.kind, f.faction, f.id)}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
