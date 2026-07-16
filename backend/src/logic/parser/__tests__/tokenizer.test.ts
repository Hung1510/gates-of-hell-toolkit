import { describe, it, expect } from "vitest";
import { tokenize } from "../tokenizer.js";

describe("tokenize", () => {
  it("tokenizes a simple call", () => {
    const tokens = tokenize('("template" side(ger) cost(60.0))');
    expect(tokens).toEqual([
      { type: "paren_open", char: "(" },
      { type: "string", value: "template" },
      { type: "word", value: "side" },
      { type: "paren_open", char: "(" },
      { type: "word", value: "ger" },
      { type: "paren_close", char: ")" },
      { type: "word", value: "cost" },
      { type: "paren_open", char: "(" },
      { type: "word", value: "60.0" },
      { type: "paren_close", char: ")" },
      { type: "paren_close", char: ")" },
    ]);
  });

  it("strips comments to end of line", () => {
    const tokens = tokenize('word1 ; this is a comment\nword2');
    expect(tokens).toEqual([
      { type: "word", value: "word1" },
      { type: "word", value: "word2" },
    ]);
  });

  it("distinguishes ( and { brackets", () => {
    const tokens = tokenize("{tech} (call)");
    expect(tokens[0]).toEqual({ type: "paren_open", char: "{" });
    expect(tokens[2]).toEqual({ type: "paren_close", char: "}" });
    expect(tokens[3]).toEqual({ type: "paren_open", char: "(" });
  });

  it("handles scientific notation numbers as a single word (real save-file case)", () => {
    const tokens = tokenize("{mp 1.00966e+06}");
    expect(tokens.map((t) => (t.type === "word" ? t.value : t.type))).toContain("1.00966e+06");
  });

  it("handles empty strings", () => {
    const tokens = tokenize('requires ""');
    expect(tokens).toEqual([
      { type: "word", value: "requires" },
      { type: "string", value: "" },
    ]);
  });
});
