// Tokenizer for Gates of Hell's ".set" config grammar.
// Verified against real files extracted from gamelogic.pak:
//   set/multiplayer/units/conquest/units_ger.set
//   set/dynamic_campaign/unit_research_ger.set
//   set/multiplayer/units/settings.set
//
// Grammar observed:
//   - ";" starts a line comment (to end of line)
//   - "(" ")" and "{" "}" are both used as grouping delimiters (treated identically here)
//   - quoted strings: "..."
//   - bare words: [A-Za-z0-9_%.*+/-]+ (includes %placeholders like %cd, and expressions like (* %cost 0.05))
//   - whitespace (including \r\n, tabs) is insignificant outside strings

export type Token =
  | { type: "paren_open"; char: "(" | "{" }
  | { type: "paren_close"; char: ")" | "}" }
  | { type: "string"; value: string }
  | { type: "word"; value: string };

export function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const n = src.length;

  while (i < n) {
    const c = src[i];

    // whitespace
    if (c === " " || c === "\t" || c === "\r" || c === "\n") {
      i++;
      continue;
    }

    // comment to end of line
    if (c === ";") {
      while (i < n && src[i] !== "\n") i++;
      continue;
    }

    // grouping
    if (c === "(" || c === "{") {
      tokens.push({ type: "paren_open", char: c });
      i++;
      continue;
    }
    if (c === ")" || c === "}") {
      tokens.push({ type: "paren_close", char: c as ")" | "}" });
      i++;
      continue;
    }

    // quoted string
    if (c === '"') {
      let j = i + 1;
      let value = "";
      while (j < n && src[j] !== '"') {
        value += src[j];
        j++;
      }
      tokens.push({ type: "string", value });
      i = j + 1;
      continue;
    }

    // bare word (identifiers, numbers, %vars, operators like * )
    let j = i;
    let value = "";
    while (j < n && !/[\s(){}";]/.test(src[j])) {
      value += src[j];
      j++;
    }
    if (value.length === 0) {
      // stray character we don't recognize (shouldn't happen) - skip it
      i++;
      continue;
    }
    tokens.push({ type: "word", value });
    i = j;
  }

  return tokens;
}
