import { describe, it, expect } from "vitest";
import { parse } from "../ast.js";
import { parseCall } from "../calls.js";

describe("parse (AST)", () => {
  it("parses a nested call into a list node", () => {
    const [node] = parse('("squad_officer_con" side(ger) c1(nco:1))');
    expect(node.kind).toBe("list");
    if (node.kind !== "list") throw new Error("expected list");
    expect(node.bracket).toBe("(");
    expect(node.items[0]).toEqual({ kind: "string", value: "squad_officer_con" });
  });

  it("tolerates mismatched bracket closing without throwing", () => {
    // real .set files sometimes mix ( and { loosely - parser should not crash
    expect(() => parse("(word1 {word2)")).not.toThrow();
  });

  it("parses multiple top-level nodes", () => {
    const nodes = parse('("a" x(1)) ("b" y(2))');
    expect(nodes).toHaveLength(2);
  });
});

describe("parseCall", () => {
  it("extracts head string and key(value) args", () => {
    const [node] = parse('("squad_officer_con" side(ger) cost(60.0))');
    const call = parseCall(node);
    expect(call).not.toBeNull();
    expect(call!.head).toBe("squad_officer_con");
    expect(call!.args.side).toBe("ger");
    expect(call!.args.cost).toBe("60.0");
  });

  it("returns null for non-list nodes", () => {
    expect(parseCall({ kind: "word", value: "x" })).toBeNull();
  });
});
