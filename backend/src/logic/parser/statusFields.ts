import { Node } from "./ast.js";

// The Conquest status file is one top-level {saveinfo ...} block whose
// children are mostly flat {key value} pairs (mp, sp, ap, rp, name, army,
// enemyArmy, difficulty, region, playedGames, wonGames, ...), plus some
// richer structures (mods, unlockedResearch, mapPoints, roundsHistory) we
// don't touch. These helpers only read/write the simple single-value fields.

function findRoot(topLevel: Node[]): Node | null {
  const root = topLevel.find((n) => n.kind === "list");
  return root ?? null;
}

export function getStatusField(topLevel: Node[], key: string): string | null {
  const root = findRoot(topLevel);
  if (!root || root.kind !== "list") return null;
  for (const item of root.items) {
    if (item.kind === "list" && item.items[0]?.kind === "word" && item.items[0].value === key) {
      const valueNode = item.items[1];
      if (!valueNode) return null;
      return valueNode.kind === "string" || valueNode.kind === "word" ? valueNode.value : null;
    }
  }
  return null;
}

// Returns a deep-cloned, modified copy of topLevel with `key`'s value node
// replaced. Does not mutate the input (safe to call multiple times against
// the same parsed original). Preserves whether the original value was a
// bare word (numbers) or a quoted string.
export function setStatusField(topLevel: Node[], key: string, newValue: string): Node[] {
  const cloned = structuredClone(topLevel) as Node[];
  const root = findRoot(cloned);
  if (!root || root.kind !== "list") {
    throw new Error("Could not find root node in status file");
  }
  for (const item of root.items) {
    if (item.kind === "list" && item.items[0]?.kind === "word" && item.items[0].value === key) {
      const valueNode = item.items[1];
      if (!valueNode || (valueNode.kind !== "string" && valueNode.kind !== "word")) {
        throw new Error(`Field "${key}" has an unexpected shape - not a simple value`);
      }
      item.items[1] = { kind: valueNode.kind, value: newValue };
      return cloned;
    }
  }
  throw new Error(`Field "${key}" not found in status file`);
}
