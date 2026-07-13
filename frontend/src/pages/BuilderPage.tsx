import { useState } from "react";
import { SquadBuilderForm } from "../components/SquadBuilderForm";
import { TechNodeBuilderForm } from "../components/TechNodeBuilderForm";

export function BuilderPage() {
  const [faction, setFaction] = useState("ger");
  const [tab, setTab] = useState<"squad" | "tech">("squad");

  return (
    <div className="builder-page">
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
        <div className="tabs">
          <button className={tab === "squad" ? "active" : ""} onClick={() => setTab("squad")}>
            Squad Builder
          </button>
          <button className={tab === "tech" ? "active" : ""} onClick={() => setTab("tech")}>
            Tech Tree Node Builder
          </button>
        </div>
      </div>

      {tab === "squad" ? <SquadBuilderForm faction={faction} /> : <TechNodeBuilderForm faction={faction} />}
    </div>
  );
}
