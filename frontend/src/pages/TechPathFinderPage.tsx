import { useEffect, useMemo, useState } from "react";
import { getTechTree } from "../api";
import { findPrerequisitePath, cumulativeCost } from "../lib/techPath";
import type { TechNode } from "../types";

const FACTIONS = ["ger", "rus", "usa", "eng", "fin"];

export function TechPathFinderPage() {
  const [faction, setFaction] = useState("ger");
  const [nodes, setNodes] = useState<TechNode[]>([]);
  const [targetId, setTargetId] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    getTechTree(faction).then((data) => {
      setNodes(data);
      setTargetId(data[0]?.id ?? "");
    });
  }, [faction]);

  const filteredNodes = useMemo(() => {
    if (!query.trim()) return nodes;
    const q = query.toLowerCase();
    return nodes.filter((n) => n.id.toLowerCase().includes(q) || n.displayName?.toLowerCase().includes(q));
  }, [nodes, query]);

  const path = useMemo(() => findPrerequisitePath(nodes, targetId), [nodes, targetId]);
  const totalCost = useMemo(() => cumulativeCost(path), [path]);
  const unresolvedCount = path.filter((s) => s.unresolved).length;

  return (
    <div className="tech-path-page">
      <p className="disclaimer">
        Walks the tech tree's real `requires` chain backward from the target, in a valid
        unlock order (every prerequisite appears before anything that needs it). Unknown
        requires (the same "single_officer" root quirk documented elsewhere in this
        project) show up as an explicit unresolved step rather than being silently
        dropped from the cost total.
      </p>

      <div className="controls">
        <label>
          Faction:{" "}
          <select value={faction} onChange={(e) => setFaction(e.target.value)}>
            {FACTIONS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
        <input
          type="text"
          placeholder="Search target node..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select value={targetId} onChange={(e) => setTargetId(e.target.value)}>
          {filteredNodes.map((n) => (
            <option key={n.id} value={n.id}>
              {n.displayName ? `${n.displayName} (${n.id})` : n.id}
            </option>
          ))}
        </select>
      </div>

      <div className="armor-summary">
        <div>{path.length} steps to unlock</div>
        <div>
          Total cost: {totalCost} research points
          {unresolvedCount > 0 && ` (${unresolvedCount} unresolved step(s) not counted)`}
        </div>
      </div>

      <table className="squad-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Node</th>
            <th>Cost</th>
            <th>Requires</th>
          </tr>
        </thead>
        <tbody>
          {path.map((step, i) => (
            <tr key={step.id} className={step.id === targetId ? "path-target-row" : ""}>
              <td>{i + 1}</td>
              <td>
                {step.unresolved ? (
                  <span className="error">{step.id} (unresolved)</span>
                ) : (
                  <>
                    <div className="display-name">{step.displayName ?? step.id}</div>
                    <div className="internal-id">{step.id}</div>
                  </>
                )}
              </td>
              <td>{step.unresolved ? "-" : step.cost}</td>
              <td className="internal-id">{step.requires.join(", ") || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
