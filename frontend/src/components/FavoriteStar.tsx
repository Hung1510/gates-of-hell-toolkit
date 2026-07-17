import { useFavorites } from "../hooks/useFavorites";

interface Props {
  kind: "squad" | "vehicle";
  faction: string;
  id: string;
  label: string;
}

export function FavoriteStar({ kind, faction, id, label }: Props) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const active = isFavorite(kind, faction, id);

  return (
    <button
      className={`favorite-star ${active ? "active" : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        toggleFavorite({ kind, faction, id, label });
      }}
      aria-label={active ? `Remove ${label} from favorites` : `Add ${label} to favorites`}
      aria-pressed={active}
      title={active ? "Remove from favorites" : "Add to favorites"}
    >
      {active ? "★" : "☆"}
    </button>
  );
}
