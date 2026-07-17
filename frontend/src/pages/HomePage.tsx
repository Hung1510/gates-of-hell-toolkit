interface ToolCard {
  eyebrow: string;
  title: string;
  description: string;
  page: string;
}

const GROUPS: { label: string; tools: ToolCard[] }[] = [
  {
    label: "Data",
    tools: [
      {
        eyebrow: "Database",
        title: "Browse units & squads",
        description: "Search and filter every Conquest squad across all 5 factions, with real cost and composition data.",
        page: "/browse",
      },
      {
        eyebrow: "Database",
        title: "Vehicles",
        description: "Real armor thickness and resolved gun penetration per ammo type, parsed straight from the game's own files.",
        page: "/vehicles",
      },
      {
        eyebrow: "Database",
        title: "Tech tree",
        description: "Interactive research tree using the game's own grid layout, with live validation while editing.",
        page: "/tech-tree",
      },
      {
        eyebrow: "Database",
        title: "Weapons",
        description: "Every resolved weapon across all categories - damage, fire rate, calibre, and penetration by ammo type.",
        page: "/weapons",
      },
    ],
  },
  {
    label: "Compare",
    tools: [
      {
        eyebrow: "Analysis",
        title: "Squad comparison",
        description: "Side-by-side cost, composition, and an estimated DPS built from real resolved weapon data.",
        page: "/compare",
      },
      {
        eyebrow: "Analysis",
        title: "Weapon comparison",
        description: "Put any two resolved weapons side by side - damage, rate of fire, calibre, penetration by ammo type.",
        page: "/weapon-compare",
      },
      {
        eyebrow: "Analysis",
        title: "Armor vs gun",
        description: "Match a vehicle's gun penetration by ammo type against another vehicle's frontal armor.",
        page: "/armor-vs-gun",
      },
      {
        eyebrow: "Analysis",
        title: "Best counter",
        description: "Rank every vehicle in an opposing faction by how well their gun beats a target's armor.",
        page: "/best-counter",
      },
      {
        eyebrow: "Analysis",
        title: "Squad best counter",
        description: "Rank every squad in an opposing faction by DPS and cost against a target squad.",
        page: "/squad-counter",
      },
    ],
  },
  {
    label: "Build",
    tools: [
      {
        eyebrow: "Editor",
        title: "Squad & tech-tree builder",
        description: "Compose custom squads and research nodes, exported as real, re-parse-verified .set snippets.",
        page: "/builder",
      },
      {
        eyebrow: "Analysis",
        title: "Tech path finder",
        description: "Find the full research order and cumulative cost to unlock any tech-tree node.",
        page: "/tech-path",
      },
    ],
  },
  {
    label: "Utilities",
    tools: [
      {
        eyebrow: "Tool",
        title: "Save editor",
        description: "Edit manpower, support, army, and resource points in a real Conquest save file.",
        page: "/save-editor",
      },
      {
        eyebrow: "Search",
        title: "Ask the mod",
        description: "Structured queries over the parsed data - which squads use X, what unlocks X, cost thresholds.",
        page: "/ask-the-mod",
      },
      {
        eyebrow: "Data",
        title: "Open data",
        description: "Download the full parsed datasets as JSON - free to use in your own tools, spreadsheets, or mods.",
        page: "/open-data",
      },
      {
        eyebrow: "Tool",
        title: "Favorites",
        description: "Squads and vehicles you've starred, saved in your browser for quick access.",
        page: "/favorites",
      },
    ],
  },
];

interface Props {
  onNavigate: (page: string) => void;
}

export function HomePage({ onNavigate }: Props) {
  return (
    <div className="home-page">
      <p className="home-intro">
        A free, community-built data toolkit for <em>Call to Arms: Gates of Hell</em> - every
        number here is parsed directly from the game's own files, not hand-entered. Not
        affiliated with Digitalmindsoft.
      </p>

      {GROUPS.map((group) => (
        <section key={group.label} className="home-group">
          <h3>{group.label}</h3>
          <div className="tool-grid">
            {group.tools.map((tool) => (
              <button key={tool.page} className="tool-card" onClick={() => onNavigate(tool.page)}>
                <span className="tool-card-eyebrow">{tool.eyebrow}</span>
                <span className="tool-card-title">{tool.title}</span>
                <span className="tool-card-desc">{tool.description}</span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
