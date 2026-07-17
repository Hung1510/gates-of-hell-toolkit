import { useCallback, useEffect, useState } from "react";

export interface FavoriteItem {
  kind: "squad" | "vehicle";
  faction: string;
  id: string; // squad name or vehicle id
  label: string; // display name or fallback to id, captured at favorite-time
  addedAt: number;
}

const STORAGE_KEY = "goh-toolkit-favorites";

function loadFavorites(): FavoriteItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveFavorites(items: FavoriteItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // localStorage unavailable (private browsing, quota, etc.) - favorites
    // just won't persist across reloads; not a fatal error
  }
}

function favoriteKey(kind: string, faction: string, id: string): string {
  return `${kind}:${faction}:${id}`;
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  useEffect(() => {
    setFavorites(loadFavorites());
  }, []);

  const isFavorite = useCallback(
    (kind: string, faction: string, id: string) =>
      favorites.some((f) => favoriteKey(f.kind, f.faction, f.id) === favoriteKey(kind, faction, id)),
    [favorites]
  );

  const toggleFavorite = useCallback((item: Omit<FavoriteItem, "addedAt">) => {
    setFavorites((prev) => {
      const key = favoriteKey(item.kind, item.faction, item.id);
      const exists = prev.some((f) => favoriteKey(f.kind, f.faction, f.id) === key);
      const next = exists
        ? prev.filter((f) => favoriteKey(f.kind, f.faction, f.id) !== key)
        : [...prev, { ...item, addedAt: Date.now() }];
      saveFavorites(next);
      return next;
    });
  }, []);

  const removeFavorite = useCallback((kind: string, faction: string, id: string) => {
    setFavorites((prev) => {
      const next = prev.filter((f) => favoriteKey(f.kind, f.faction, f.id) !== favoriteKey(kind, faction, id));
      saveFavorites(next);
      return next;
    });
  }, []);

  return { favorites, isFavorite, toggleFavorite, removeFavorite };
}
