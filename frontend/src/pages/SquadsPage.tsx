import { useEffect, useMemo, useState } from "react";
import { useSquads } from "../hooks/useSquads";
import { SquadTable } from "../components/SquadTable";
import { TableSkeleton } from "../components/TableSkeleton";
import { getUnitCosts } from "../api";
import { computeSquadCost } from "../lib/squadCost";
import type { UnitCostEntry } from "../types";

export function SquadsPage() {
  const [faction, setFaction] = useState<string | undefined>("ger");
  const [query, setQuery] = useState("");
  const [costMin, setCostMin] = useState("");
  const [costMax, setCostMax] = useState("");
  const [stageMin, setStageMin] = useState("");
  const [stageMax, setStageMax] = useState("");
  const [mustContain, setMustContain] = useState("");
  const { squads, loading, error } = useSquads(faction);

  const [costs, setCosts] = useState<UnitCostEntry[]>([]);
  useEffect(() => {
    if (faction) getUnitCosts(faction).then(setCosts);
  }, [faction]);
  const costById = useMemo(() => new Map(costs.map((c) => [c.id, c.cost])), [costs]);


  const filtered = useMemo(() => {
    const min = costMin.trim() ? parseFloat(costMin) : null;
    const max = costMax.trim() ? parseFloat(costMax) : null;
    const stMin = stageMin.trim() ? parseInt(stageMin, 10) : null;
    const stMax = stageMax.trim() ? parseInt(stageMax, 10) : null;
    const required = mustContain
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    return squads.filter((s) => {
      if (query.trim()) {
        const q = query.toLowerCase();
        const matchesText =
          s.name.toLowerCase().includes(q) || s.slots.some((slot) => slot.unitType.toLowerCase().includes(q));
        if (!matchesText) return false;
      }

      if (min !== null || max !== null) {
        const cost = computeSquadCost(s.slots, costById);
        if (cost === null) return false;
        if (min !== null && cost < min) return false;
        if (max !== null && cost > max) return false;
      }

      if (stMin !== null && (s.maxStage === null || s.maxStage < stMin)) return false;
      if (stMax !== null && (s.minStage === null || s.minStage > stMax)) return false;

      if (required.length > 0) {
        const unitTypes = s.slots.map((sl) => sl.unitType.toLowerCase());
        const hasAll = required.every((r) => unitTypes.some((u) => u.includes(r)));
        if (!hasAll) return false;
      }

      return true;
    });
  }, [squads, query, costMin, costMax, stageMin, stageMax, mustContain, costById]);

  return (
    <div className="squads-page">
      <div className="controls">
        <label>
          Faction:{" "}
          <select value={faction} onChange={(e) => setFaction(e.target.value)}>
            <option value="ger">German</option>
            <option value="rus">Soviet</option>
            <option value="usa">USA</option>
            <option value="eng">British/Commonwealth</option>
            <option value="fin">Finnish</option>
          </select>
        </label>
        <input
          type="text"
          placeholder="Filter by squad name or unit type..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="advanced-filters">
        <label>
          Cost min
          <input type="number" value={costMin} onChange={(e) => setCostMin(e.target.value)} placeholder="e.g. 0" />
        </label>
        <label>
          Cost max
          <input type="number" value={costMax} onChange={(e) => setCostMax(e.target.value)} placeholder="e.g. 300" />
        </label>
        <label>
          Stage min
          <input type="number" value={stageMin} onChange={(e) => setStageMin(e.target.value)} />
        </label>
        <label>
          Stage max
          <input type="number" value={stageMax} onChange={(e) => setStageMax(e.target.value)} />
        </label>
        <label className="wide">
          Must include unit type(s) (comma-separated, e.g. "pzf, mg42")
          <input value={mustContain} onChange={(e) => setMustContain(e.target.value)} />
        </label>
      </div>

      {loading && <TableSkeleton columns={7} />}
      {error && (
        <p className="error">
          Failed to load: {error}. (If this faction's .set files haven't been
          added to backend/src/data/samples yet, that's expected — only "ger" is
          seeded currently.)
        </p>
      )}
      {!loading && !error && (
        <>
          <p>
            {filtered.length} of {squads.length} squads
          </p>
          <SquadTable squads={filtered} costById={costById} />
        </>
      )}
    </div>
  );
}
