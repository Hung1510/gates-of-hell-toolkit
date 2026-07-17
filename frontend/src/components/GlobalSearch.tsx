import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSquads, getVehicles, getWeapons, getTechTree } from "../api";

const FACTIONS = ["ger", "rus", "usa", "eng", "fin"];

interface SearchResult {
  kind: "squad" | "vehicle" | "weapon" | "tech";
  label: string;
  sublabel: string;
  navigateTo: string;
}

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) {
      setResults([]);
      return;
    }

    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const found: SearchResult[] = [];

        const weapons = await getWeapons();
        for (const w of weapons) {
          if (w.id.toLowerCase().includes(q)) {
            found.push({ kind: "weapon", label: w.id, sublabel: w.category, navigateTo: "/weapons" });
          }
        }

        for (const faction of FACTIONS) {
          const [squads, vehicles, tech] = await Promise.all([
            getSquads(faction),
            getVehicles(faction),
            getTechTree(faction),
          ]);
          for (const s of squads) {
            if (s.name.toLowerCase().includes(q) || s.displayName?.toLowerCase().includes(q)) {
              found.push({
                kind: "squad",
                label: s.displayName ?? s.name,
                sublabel: `${faction} squad - ${s.name}`,
                navigateTo: "/browse",
              });
            }
          }
          for (const v of vehicles) {
            if (v.id.toLowerCase().includes(q)) {
              found.push({ kind: "vehicle", label: v.id, sublabel: `${faction} vehicle - ${v.category}`, navigateTo: "/vehicles" });
            }
          }
          for (const n of tech) {
            if (n.id.toLowerCase().includes(q) || n.displayName?.toLowerCase().includes(q)) {
              found.push({
                kind: "tech",
                label: n.displayName ?? n.id,
                sublabel: `${faction} tech node - ${n.id}`,
                navigateTo: "/tech-tree",
              });
            }
          }
        }

        setResults(found.slice(0, 40));
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(handle);
  }, [query]);

  function handleSelect(result: SearchResult) {
    setOpen(false);
    setQuery("");
    navigate(result.navigateTo);
  }

  return (
    <div className="global-search" ref={containerRef}>
      <input
        type="text"
        placeholder="Search everything..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        aria-label="Search squads, vehicles, weapons, and tech nodes"
        aria-expanded={open}
        role="combobox"
        aria-autocomplete="list"
      />
      {open && query.trim().length >= 2 && (
        <div className="global-search-results" role="listbox" aria-live="polite">
          {loading && <div className="global-search-status">Searching...</div>}
          {!loading && results.length === 0 && <div className="global-search-status">No matches</div>}
          {!loading &&
            results.map((r, i) => (
              <button key={`${r.kind}-${r.label}-${i}`} className="global-search-result" onClick={() => handleSelect(r)}>
                <span className={`global-search-kind kind-${r.kind}`}>{r.kind}</span>
                <span className="global-search-label">{r.label}</span>
                <span className="global-search-sublabel">{r.sublabel}</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
