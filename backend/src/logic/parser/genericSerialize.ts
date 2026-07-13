import { Node } from "./ast.js";

function closingFor(bracket: "(" | "{"): ")" | "}" {
  return bracket === "(" ? ")" : "}";
}

function serializeNode(node: Node): string {
  if (node.kind === "string") return `"${node.value}"`;
  if (node.kind === "word") return node.value;
  const inner = node.items.map(serializeNode).join(" ");
  return `${node.bracket}${inner}${closingFor(node.bracket)}`;
}

// Serializes a full top-level node list back into valid .set/.scn syntax.
// This is deliberately generic (unlike serializeSquad/serializeTechNode) -
// it round-trips ANY structure the tokenizer can parse, at the cost of not
// preserving original comments/whitespace/formatting (irrelevant to the
// game, which uses the same whitespace-insensitive parser).
export function serializeTopLevel(nodes: Node[]): string {
  return nodes.map(serializeNode).join("\n");
}
