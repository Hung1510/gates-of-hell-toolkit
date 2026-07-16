import { Node } from "./ast.js";

const OPERATORS = new Set(["+", "-", "*", "/"]);

// Recursively evaluates a fully-substituted arithmetic expression node, e.g.
// a list like (* 70 0.05) or (+ 58 (+ 1.3 (/ (- 58 40) 4.4))). Returns null
// if the node isn't a numeric literal or a recognized operator expression
// (rather than throwing - callers should treat null as "not resolvable").
export function evalExpr(node: Node): number | null {
  if (node.kind === "word") {
    const n = parseFloat(node.value);
    return Number.isNaN(n) ? null : n;
  }
  if (node.kind !== "list") return null;

  const [opNode, ...rest] = node.items;
  if (opNode?.kind !== "word" || !OPERATORS.has(opNode.value)) return null;

  const values = rest.map(evalExpr);
  if (values.some((v) => v === null)) return null;
  const nums = values as number[];

  switch (opNode.value) {
    case "+":
      return nums.reduce((a, b) => a + b, 0);
    case "-":
      return nums.length === 1 ? -nums[0] : nums.reduce((a, b) => a - b);
    case "*":
      return nums.reduce((a, b) => a * b, 1);
    case "/":
      return nums.reduce((a, b) => a / b);
    default:
      return null;
  }
}
