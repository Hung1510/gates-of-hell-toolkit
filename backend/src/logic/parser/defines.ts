import { Node } from "./ast.js";

// A "define" is a top-level call like (define "name" body-node-1 body-node-2 ...).
// Returns a map of name -> body nodes (everything after the name).
export function extractDefines(topLevel: Node[]): Map<string, Node[]> {
  const defines = new Map<string, Node[]>();

  for (const node of topLevel) {
    if (node.kind !== "list") continue;
    const head = node.items[0];
    if (head?.kind !== "word" || head.value !== "define") continue;
    const nameNode = node.items[1];
    if (nameNode?.kind !== "string") continue;
    defines.set(nameNode.value, node.items.slice(2));
  }

  return defines;
}
