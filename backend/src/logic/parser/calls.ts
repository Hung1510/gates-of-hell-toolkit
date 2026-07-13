import { Node } from "./ast.js";

// Represents a parsed call of the form:
//   ("template_name" key1(val1) key2(val2 val3) ...)
// or the { } wrapped variant.
export interface ParsedCall {
  bracket: "(" | "{";
  head: string | null; // leading bare string, e.g. the template/type name
  args: Record<string, string>; // key(value) pairs, value textually joined
  raw: Node; // original node, for anything the extractor needs manually
}

function nodeText(node: Node): string {
  if (node.kind === "string") return node.value;
  if (node.kind === "word") return node.value;
  // list: join children's text with spaces (rare case)
  return node.items.map(nodeText).join(" ");
}

export function parseCall(node: Node): ParsedCall | null {
  if (node.kind !== "list") return null;
  const items = node.items;
  let idx = 0;
  let head: string | null = null;

  if (items.length > 0 && items[0].kind === "string") {
    head = items[0].value;
    idx = 1;
  }

  const args: Record<string, string> = {};
  while (idx < items.length) {
    const item = items[idx];
    if (item.kind === "word") {
      const next = items[idx + 1];
      if (next && next.kind === "list") {
        args[item.value] = nodeText(next);
        idx += 2;
        continue;
      }
      // bare word with no following (...) - store as flag with empty value
      args[item.value] = "";
      idx += 1;
      continue;
    }
    // stray string or list not preceded by a word key - skip
    idx += 1;
  }

  return { bracket: node.bracket, head, args, raw: node };
}
