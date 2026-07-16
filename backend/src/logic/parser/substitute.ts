import { Node } from "./ast.js";

export interface Bindings {
  positional?: Node[]; // for %0, %1, %2... style templates
  keyword?: Record<string, Node>; // for %name style templates
}

// Recursively replaces any word node exactly matching "%0", "%1", ... or
// "%paramName" with its bound value. Leaves unresolved %refs as literal
// text (rather than throwing) - this is a deliberate honesty signal: if a
// resolved field still contains a literal "%something", that's visible
// proof the substitution didn't fully resolve, rather than silently
// producing a wrong number.
export function substitute(node: Node, bindings: Bindings): Node {
  if (node.kind === "word" && node.value.startsWith("%")) {
    const key = node.value.slice(1);
    if (bindings.keyword && key in bindings.keyword) {
      return bindings.keyword[key];
    }
    if (bindings.positional) {
      const idx = parseInt(key, 10);
      if (!Number.isNaN(idx) && bindings.positional[idx] !== undefined) {
        return bindings.positional[idx];
      }
    }
    return node; // left unresolved, deliberately visible as "%x" in output
  }
  if (node.kind !== "list") return node;
  return { kind: "list", bracket: node.bracket, items: node.items.map((item) => substitute(item, bindings)) };
}
