import type { TechNode } from "../types";

export interface TechPathStep {
  id: string;
  displayName: string | null;
  cost: number;
  requires: string[];
  unresolved: boolean; // true if this id wasn't found in the tree (e.g. the known single_officer quirk)
}

// Walks `requires` backward from targetId via post-order DFS, so
// prerequisites always appear before the nodes that need them - a valid
// research order, not just an unordered set of ancestors. Unknown
// requires (e.g. the single_officer quirk documented elsewhere in this
// project) are included as a step with unresolved=true rather than
// silently dropped, so the gap is visible instead of hidden.
export function findPrerequisitePath(nodes: TechNode[], targetId: string): TechPathStep[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  if (!byId.has(targetId)) return [];

  const visited = new Set<string>();
  const order: TechPathStep[] = [];

  function visit(id: string) {
    if (visited.has(id)) return;
    visited.add(id);

    const node = byId.get(id);
    if (!node) {
      order.push({ id, displayName: null, cost: 0, requires: [], unresolved: true });
      return;
    }
    for (const req of node.requires) {
      visit(req);
    }
    order.push({ id: node.id, displayName: node.displayName, cost: node.cost, requires: node.requires, unresolved: false });
  }

  visit(targetId);
  return order;
}

export function cumulativeCost(path: TechPathStep[]): number {
  return path.reduce((sum, step) => sum + step.cost, 0);
}
