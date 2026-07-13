import type { TechNode } from "./parser/techtree.js";

export interface ValidationWarning {
  severity: "error" | "warning";
  message: string;
}

// Detects a cycle by walking `requires` edges starting from `node.id`,
// treating the full tree (with `node` substituted in/added) as a directed
// graph. Returns the cycle path if one exists, so the message can show it.
function findCycle(allNodes: Map<string, TechNode>, startId: string): string[] | null {
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const path: string[] = [];

  function dfs(id: string): string[] | null {
    if (visited.has(id)) return null;
    if (visiting.has(id)) {
      // found a cycle - return the portion of path from the repeated id onward
      const idx = path.indexOf(id);
      return [...path.slice(idx), id];
    }
    visiting.add(id);
    path.push(id);
    const node = allNodes.get(id);
    if (node) {
      for (const reqId of node.requires) {
        const cycle = dfs(reqId);
        if (cycle) return cycle;
      }
    }
    path.pop();
    visiting.delete(id);
    visited.add(id);
    return null;
  }

  return dfs(startId);
}

export interface GridBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

// Computes the observed grid bounds from the existing real tech tree, so
// "outside grid bounds" is checked against what the game's own data
// actually uses, not an arbitrary guess.
export function computeGridBounds(nodes: TechNode[]): GridBounds {
  const xs = nodes.map((n) => n.position.x);
  const ys = nodes.map((n) => n.position.y);
  return {
    minX: Math.min(0, ...xs),
    maxX: Math.max(0, ...xs),
    minY: Math.min(0, ...ys),
    maxY: Math.max(0, ...ys),
  };
}

// Validates a candidate node (new or edited) against the rest of the tree.
// `existingNodes` should NOT include the candidate itself if editing (the
// candidate replaces whatever had the same id).
export function validateTechNode(
  candidate: TechNode,
  existingNodes: TechNode[],
  bounds: GridBounds
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  const others = existingNodes.filter((n) => n.id !== candidate.id);
  const allNodes = new Map(others.map((n) => [n.id, n]));
  allNodes.set(candidate.id, candidate);

  // 1. Unknown requires (id doesn't exist anywhere in the tree)
  for (const reqId of candidate.requires) {
    if (!allNodes.has(reqId)) {
      warnings.push({
        severity: "warning",
        message: `Requires unknown node "${reqId}" - it doesn't exist elsewhere in this faction's tree (this can be legitimate, e.g. the "single_officer" root quirk, but double-check the id).`,
      });
    }
  }

  // 2. Self-reference
  if (candidate.requires.includes(candidate.id)) {
    warnings.push({ severity: "error", message: `Node requires itself ("${candidate.id}").` });
  }

  // 3. Cyclic dependency
  const cycle = findCycle(allNodes, candidate.id);
  if (cycle) {
    warnings.push({
      severity: "error",
      message: `Cyclic dependency detected: ${cycle.join(" -> ")}`,
    });
  }

  // 4. Out-of-bounds grid position (vs. the real observed range for this faction)
  const { x, y } = candidate.position;
  if (x < bounds.minX || x > bounds.maxX + 2 || y < bounds.minY || y > bounds.maxY + 2) {
    warnings.push({
      severity: "warning",
      message: `Position (${x}, ${y}) is outside the observed grid range for this faction (x: ${bounds.minX}-${bounds.maxX}, y: ${bounds.minY}-${bounds.maxY}). It may render off-screen or overlap the tree's edge in-game.`,
    });
  }

  // 5. Position collision with an existing node
  const collision = others.find((n) => n.position.x === x && n.position.y === y);
  if (collision) {
    warnings.push({
      severity: "warning",
      message: `Position (${x}, ${y}) is already occupied by "${collision.id}" - they'll overlap visually.`,
    });
  }

  // 6. Negative or zero cost sanity check
  if (candidate.cost < 0) {
    warnings.push({ severity: "error", message: `Cost cannot be negative (${candidate.cost}).` });
  }

  return warnings;
}
