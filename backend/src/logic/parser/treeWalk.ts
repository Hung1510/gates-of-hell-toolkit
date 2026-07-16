import { Node } from "./ast.js";

// Recursively finds all list nodes anywhere in the tree (at any depth)
// whose first item is a word matching `headWord`. Vehicle .def files nest
// fields like {weapon "x"} or {mass 500} at wildly different depths
// depending on vehicle type (car vs tank vs plane vs cannon), so a fixed
// path won't work - we need to search the whole tree.
export function findAllByHead(nodes: Node[], headWord: string): Node[] {
  const results: Node[] = [];

  function visit(node: Node) {
    if (node.kind === "list") {
      const first = node.items[0];
      if (first && first.kind === "word" && first.value === headWord) {
        results.push(node);
      }
      for (const child of node.items) visit(child);
    }
  }

  for (const n of nodes) visit(n);
  return results;
}

// Same idea but matches list nodes whose head is a STRING equal to headString
// (used for template-invocation-style calls like ("mobility_tank" speed(55) ...)
// where the first item is a quoted string, not a bare word).
export function findAllByHeadString(nodes: Node[], headString: string): Node[] {
  const results: Node[] = [];

  function visit(node: Node) {
    if (node.kind === "list") {
      const first = node.items[0];
      if (first && first.kind === "string" && first.value === headString) {
        results.push(node);
      }
      for (const child of node.items) visit(child);
    }
  }

  for (const n of nodes) visit(n);
  return results;
}

export function wordValue(node: Node | undefined): string | null {
  if (!node) return null;
  return node.kind === "word" ? node.value : node.kind === "string" ? node.value : null;
}

export function numberValue(node: Node | undefined): number | null {
  const v = wordValue(node);
  if (v === null) return null;
  const n = parseFloat(v);
  return Number.isNaN(n) ? null : n;
}
