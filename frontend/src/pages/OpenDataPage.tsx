import { useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";
const FACTIONS = ["ger", "rus", "usa", "eng", "fin"];

interface Dataset {
  id: string;
  title: string;
  description: string;
  fetcher: () => Promise<unknown>;
}

async function fetchAllFactions(endpoint: string): Promise<Record<string, unknown>> {
  const result: Record<string, unknown> = {};
  for (const faction of FACTIONS) {
    const res = await fetch(`${API_BASE}${endpoint}?faction=${faction}`);
    result[faction] = await res.json();
  }
  return result;
}

const DATASETS: Dataset[] = [
  {
    id: "squads",
    title: "Squads",
    description: "Every Conquest squad across all 5 factions - composition, cost, display names.",
    fetcher: () => fetchAllFactions("/api/squads"),
  },
  {
    id: "techtree",
    title: "Tech tree",
    description: "Research nodes, prerequisites, costs, and grid positions for all 5 factions.",
    fetcher: () => fetchAllFactions("/api/techtree"),
  },
  {
    id: "vehicles",
    title: "Vehicles",
    description: "Armor thickness and resolved gun stats for all 5 factions' vehicles.",
    fetcher: async () => {
      const result: Record<string, unknown> = {};
      for (const faction of FACTIONS) {
        const res = await fetch(`${API_BASE}/api/vehicles?faction=${faction}`);
        result[faction] = await res.json();
      }
      return result;
    },
  },
  {
    id: "weapons",
    title: "Weapons",
    description: "Every resolved weapon (rifles, MGs, guns) with damage/rpm/penetration, independent of faction.",
    fetcher: async () => {
      const res = await fetch(`${API_BASE}/api/weapons`);
      return res.json();
    },
  },
  {
    id: "unit-costs",
    title: "Unit costs",
    description: "Per-soldier cost and display names for all 5 factions.",
    fetcher: () => fetchAllFactions("/api/units/costs"),
  },
];

export function OpenDataPage() {
  const [loading, setLoading] = useState<string | null>(null);

  async function handleDownload(dataset: Dataset) {
    setLoading(dataset.id);
    try {
      const data = await dataset.fetcher();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `goh-toolkit-${dataset.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="open-data-page">
      <p className="disclaimer">
        All the data this toolkit shows is available here as plain JSON - free to use in your
        own tools, spreadsheets, or mods. This is parsed from the game's own files, not owned by
        this project; it belongs to Digitalmindsoft/the game's publishers. No attribution
        required, but a link back is appreciated. The live API endpoints behind these downloads
        are documented in the project's README on GitHub.
      </p>

      <div className="tool-grid">
        {DATASETS.map((dataset) => (
          <div key={dataset.id} className="tool-card" style={{ cursor: "default" }}>
            <span className="tool-card-eyebrow">JSON</span>
            <span className="tool-card-title">{dataset.title}</span>
            <span className="tool-card-desc">{dataset.description}</span>
            <button
              className="generate-btn"
              style={{ marginTop: 10 }}
              onClick={() => handleDownload(dataset)}
              disabled={loading === dataset.id}
            >
              {loading === dataset.id ? "Fetching..." : "Download"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
