import { Handle, Position } from "reactflow";

export interface TechNodeData {
  label: string;
  displayName: string | null;
  isTechUpgrade: boolean;
  hasUnresolvedRequires: boolean;
  isSelected: boolean;
  isMatched: boolean;
}

export function TechNodeBox({ data }: { data: TechNodeData }) {
  const bg = data.isTechUpgrade ? "#2b4a75" : "#2d5a3d";
  let borderColor = "transparent";
  if (data.isSelected) borderColor = "#ffd166";
  else if (data.isMatched) borderColor = "#7fb2ff";
  else if (data.hasUnresolvedRequires) borderColor = "#c0392b";

  const shownText = data.displayName ?? data.label;

  return (
    <div
      style={{
        background: bg,
        border: `2px solid ${borderColor}`,
        borderRadius: 4,
        padding: "3px 8px",
        fontSize: 10,
        color: "#e6e6e6",
        minWidth: 100,
        textAlign: "center",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
      title={data.displayName ? `${data.displayName} (${data.label})` : data.label}
    >
      <Handle type="target" position={Position.Left} style={{ background: "#555", width: 6, height: 6 }} />
      {shownText.length > 18 ? shownText.slice(0, 17) + "…" : shownText}
      <Handle type="source" position={Position.Right} style={{ background: "#555", width: 6, height: 6 }} />
    </div>
  );
}
