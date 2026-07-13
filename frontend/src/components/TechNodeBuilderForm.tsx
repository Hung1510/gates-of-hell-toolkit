import { useEffect, useState } from "react";
import type { TechNode } from "../types";
import { getTechTree, buildTechNode } from "../api";
import { CodePreview } from "./CodePreview";

interface Props {
  faction: string;
}

export function TechNodeBuilderForm({ faction }: Props) {
  const [existingIds, setExistingIds] = useState<string[]>([]);
  const [id, setId] = useState("my_custom_tech");
  const [requires, setRequires] = useState("");
  const [cost, setCost] = useState(1);
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [isTechUpgrade, setIsTechUpgrade] = useState(true);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTechTree(faction).then((nodes) => setExistingIds(nodes.map((n) => n.id)));
  }, [faction]);

  async function handleGenerate() {
    const node: TechNode = {
      id,
      displayName: null,
      requires: requires.trim() ? requires.trim().split(/\s+/) : [],
      cost,
      position: { x, y },
      isTechUpgrade,
    };

    try {
      const result = await buildTechNode(node);
      setCode(result.code);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setCode("");
    }
  }

  return (
    <div className="builder-form">
      <div className="form-grid">
        <label>
          Node id
          <input value={id} onChange={(e) => setId(e.target.value)} />
        </label>

        <label>
          Requires (space-separated ids)
          <input
            value={requires}
            onChange={(e) => setRequires(e.target.value)}
            placeholder="e.g. defense_level_1"
            list="tech-id-list"
          />
        </label>

        <label>
          Cost
          <input type="number" value={cost} onChange={(e) => setCost(parseFloat(e.target.value) || 0)} />
        </label>

        <label>
          Position X
          <input type="number" value={x} onChange={(e) => setX(parseFloat(e.target.value) || 0)} />
        </label>

        <label>
          Position Y
          <input type="number" value={y} onChange={(e) => setY(parseFloat(e.target.value) || 0)} />
        </label>

        <label className="checkbox-label">
          <input type="checkbox" checked={isTechUpgrade} onChange={(e) => setIsTechUpgrade(e.target.checked)} />
          Is a "tech" upgrade node
        </label>
      </div>

      <datalist id="tech-id-list">
        {existingIds.map((tid) => (
          <option key={tid} value={tid} />
        ))}
      </datalist>

      <button className="generate-btn" onClick={handleGenerate}>
        Generate .set snippet
      </button>

      <CodePreview code={code} filename={`${id || "tech_node"}.set`} error={error} />
    </div>
  );
}
