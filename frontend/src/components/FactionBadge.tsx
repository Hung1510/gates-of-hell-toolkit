const FACTION_INFO: Record<string, { label: string; color: string }> = {
  ger: { label: "GER", color: "#8a9a7a" },
  rus: { label: "RUS", color: "#a3554a" },
  usa: { label: "USA", color: "#5d7a96" },
  eng: { label: "ENG", color: "#8a7a56" },
  fin: { label: "FIN", color: "#7a8a9a" },
};

interface Props {
  faction: string;
  size?: "sm" | "md";
}

export function FactionBadge({ faction, size = "sm" }: Props) {
  const info = FACTION_INFO[faction] ?? { label: faction.slice(0, 3).toUpperCase(), color: "#8f8a72" };
  return (
    <span
      className={`faction-badge faction-badge-${size}`}
      style={{ borderColor: info.color, color: info.color }}
      title={faction}
    >
      {info.label}
    </span>
  );
}
