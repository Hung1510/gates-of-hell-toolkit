import { Token, tokenize } from "./tokenizer.js";

// A node is either a leaf (string/word) or a list of nodes, tagged with
// which bracket char opened it ("(" vs "{") since both appear and some
// downstream logic may care to distinguish them.
export type Node =
  | { kind: "string"; value: string }
  | { kind: "word"; value: string }
  | { kind: "list"; bracket: "(" | "{"; items: Node[] };

export function parse(src: string): Node[] {
  const tokens = tokenize(src);
  let pos = 0;

  function parseOne(): Node {
    const tok = tokens[pos];
    if (tok.type === "string") {
      pos++;
      return { kind: "string", value: tok.value };
    }
    if (tok.type === "word") {
      pos++;
      return { kind: "word", value: tok.value };
    }
    if (tok.type === "paren_open") {
      const openChar = tok.char;
      const closeChar = openChar === "(" ? ")" : "}";
      pos++;
      const items: Node[] = [];
      while (
        pos < tokens.length &&
        !(tokens[pos].type === "paren_close" && (tokens[pos] as any).char === closeChar)
      ) {
        // Tolerate mismatched brackets (some .set files mix them loosely) -
        // if we hit any paren_close, just close out here rather than throwing.
        if (tokens[pos].type === "paren_close") break;
        items.push(parseOne());
      }
      if (pos < tokens.length && tokens[pos].type === "paren_close") pos++;
      return { kind: "list", bracket: openChar, items };
    }
    throw new Error(`Unexpected token at position ${pos}: ${JSON.stringify(tok)}`);
  }

  const top: Node[] = [];
  while (pos < tokens.length) {
    top.push(parseOne());
  }
  return top;
}

// Convenience: flatten a list node's items into a lookup of
// "identifier(args)" style calls -> args, plus bare leading strings/words.
// Used by extractors so they don't need to walk raw Node trees themselves.
export function listItems(node: Node): Node[] {
  if (node.kind !== "list") return [];
  return node.items;
}
