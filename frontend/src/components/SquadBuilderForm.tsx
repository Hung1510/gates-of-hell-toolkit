import { useEffect, useMemo, useState } from "react";
import type { Squad, SquadSlot, SquadTemplate } from "../types";
import { getTemplates, getUnits, getSquads, buildSquad } from "../api";
import { CodePreview } from "./CodePreview";

interface Props {
  faction: string;
}

export function SquadBuilderForm({ faction }: Props) {
  const [templates, setTemplates] = useState<SquadTemplate[]>([]);
  const [units, setUnits] = useState<string[]>([]);
  const [existingSquads, setExistingSquads] = useState<Squad[]>([]);
  const [loadTarget, setLoadTarget] = useState("");
  const [templateKey, setTemplateKey] = useState<string>("");
  const [name, setName] = useState("my_custom_squad");
  const [period, setPeriod] = useState("mid");
  const [minStage, setMinStage] = useState(3);
  const [maxStage, setMaxStage] = useState(99);
  const [vehicle, setVehicle] = useState("");
  const [slotValues, setSlotValues] = useState<Record<string, { unitType: string; count: number }>>({});
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTemplates(faction).then(setTemplates);
    getUnits(faction).then(setUnits);
    getSquads(faction).then(setExistingSquads);
  }, [faction]);

  const selectedTemplate = useMemo(
    () => templates.find((t) => `${t.template}::${t.slotKeys.join(",")}` === templateKey),
    [templates, templateKey]
  );

  // Reset slot inputs whenever the chosen template shape changes (unless
  // we're actively loading an existing squad - handled separately below)
  useEffect(() => {
    if (!selectedTemplate) return;
    setSlotValues((prev) => {
      const next: Record<string, { unitType: string; count: number }> = {};
      for (const key of selectedTemplate.slotKeys) {
        next[key] = prev[key] ?? { unitType: units[0] ?? "", count: 1 };
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplate]);

  function handleLoadExisting() {
    const squad = existingSquads.find((s) => s.name === loadTarget);
    if (!squad) return;
    const matchingTemplateKey = `${squad.template}::${squad.slots.map((s) => s.slot).join(",")}`;
    setTemplateKey(matchingTemplateKey);
    setName(squad.name);
    setPeriod(squad.period ?? "mid");
    setMinStage(squad.minStage ?? 3);
    setMaxStage(squad.maxStage ?? 99);
    setVehicle(squad.vehicle ?? "");
    const slots: Record<string, { unitType: string; count: number }> = {};
    for (const s of squad.slots) slots[s.slot] = { unitType: s.unitType, count: s.count };
    setSlotValues(slots);
    setCode("");
    setError(null);
  }

  async function handleGenerate() {
    if (!selectedTemplate) {
      setError("Pick a template shape first");
      return;
    }
    const slots: SquadSlot[] = selectedTemplate.slotKeys.map((key) => ({
      slot: key,
      unitType: slotValues[key]?.unitType ?? "",
      count: slotValues[key]?.count ?? 1,
    }));

    const squad: Squad = {
      template: selectedTemplate.template,
      name,
      displayName: null,
      side: faction,
      period,
      minStage,
      maxStage,
      vehicle: selectedTemplate.isVehicle ? vehicle || null : null,
      vehicleDisplayName: null,
      slots,
      wrapperName: selectedTemplate.isVehicle ? name : null,
    };

    try {
      const result = await buildSquad(squad);
      setCode(result.code);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setCode("");
    }
  }

  return (
    <div className="builder-form">
      <div className="load-existing-row">
        <select value={loadTarget} onChange={(e) => setLoadTarget(e.target.value)}>
          <option value="">-- load an existing squad to edit (optional) --</option>
          {existingSquads.map((s) => (
            <option key={s.name} value={s.name}>
              {s.displayName ? `${s.displayName} (${s.name})` : s.name}
            </option>
          ))}
        </select>
        <button onClick={handleLoadExisting} disabled={!loadTarget}>
          Load for editing
        </button>
      </div>

      <div className="form-grid">
        <label>
          Template shape
          <select value={templateKey} onChange={(e) => setTemplateKey(e.target.value)}>
            <option value="">-- choose --</option>
            {templates.map((t) => {
              const key = `${t.template}::${t.slotKeys.join(",")}`;
              return (
                <option key={key} value={key}>
                  {t.template} ({t.slotKeys.join(", ")}) - seen {t.exampleCount}x
                </option>
              );
            })}
          </select>
        </label>

        <label>
          Squad id (name)
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <label>
          Period
          <input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="early / mid / late" />
        </label>

        <label>
          Min stage
          <input type="number" value={minStage} onChange={(e) => setMinStage(parseInt(e.target.value, 10) || 0)} />
        </label>

        <label>
          Max stage
          <input type="number" value={maxStage} onChange={(e) => setMaxStage(parseInt(e.target.value, 10) || 0)} />
        </label>

        {selectedTemplate?.isVehicle && (
          <label>
            Vehicle id
            <input
              value={vehicle}
              onChange={(e) => setVehicle(e.target.value)}
              placeholder="e.g. kubelwagen"
              list="unit-list"
            />
          </label>
        )}
      </div>

      {selectedTemplate && (
        <div className="slots-editor">
          <h4>Composition</h4>
          {selectedTemplate.slotKeys.map((key) => (
            <div className="slot-row" key={key}>
              <span className="slot-label">{key}</span>
              <input
                list="unit-list"
                placeholder="unit type"
                value={slotValues[key]?.unitType ?? ""}
                onChange={(e) =>
                  setSlotValues((prev) => ({
                    ...prev,
                    [key]: { unitType: e.target.value, count: prev[key]?.count ?? 1 },
                  }))
                }
              />
              <input
                type="number"
                min={1}
                value={slotValues[key]?.count ?? 1}
                onChange={(e) =>
                  setSlotValues((prev) => ({
                    ...prev,
                    [key]: { unitType: prev[key]?.unitType ?? "", count: parseInt(e.target.value, 10) || 1 },
                  }))
                }
              />
            </div>
          ))}
        </div>
      )}

      <datalist id="unit-list">
        {units.map((u) => (
          <option key={u} value={u} />
        ))}
      </datalist>

      <button className="generate-btn" onClick={handleGenerate}>
        Generate .set snippet
      </button>

      <CodePreview code={code} filename={`${name || "squad"}.set`} error={error} />
    </div>
  );
}
