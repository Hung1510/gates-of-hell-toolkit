import { Node } from "./ast.js";

export interface Invocation {
  name: string;
  // Exactly one of these is populated, based on whether the real call used
  // the "args" marker (positional, e.g. ("penetration" args 17.3 8 4 2 0))
  // or keyword pairs (e.g. ("penetration" a(58) b(40) ...) or ("velocity" mps(760))).
  // Both conventions are used in real files for the SAME template name in
  // different weapon categories - verified by checking real call sites
  // before assuming either was universal.
  positional: Node[] | null;
  keyword: Record<string, Node> | null;
}

// Parses a call node like ("template_name" args v1 v2 ...) or
// ("template_name" key1(v1) key2(v2) ...). Returns null if the node isn't
// a call (list with a string head).
export function parseInvocation(node: Node): Invocation | null {
  if (node.kind !== "list") return null;
  const head = node.items[0];
  if (head?.kind !== "string") return null;

  const rest = node.items.slice(1);

  if (rest[0]?.kind === "word" && rest[0].value === "args") {
    return { name: head.value, positional: rest.slice(1), keyword: null };
  }

  const keyword: Record<string, Node> = {};
  for (let i = 0; i < rest.length; i++) {
    const key = rest[i];
    const next = rest[i + 1];
    if (key.kind === "word" && next?.kind === "list") {
      keyword[key.value] = next.items.length === 1 ? next.items[0] : next;
      i++;
    }
  }
  return { name: head.value, positional: null, keyword };
}
