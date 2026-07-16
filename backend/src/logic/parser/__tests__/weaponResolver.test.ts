import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parse } from "../ast.js";
import { evalExpr } from "../exprEval.js";
import { parseInvocation } from "../invocation.js";
import { substitute } from "../substitute.js";
import { buildRegistryForPath } from "../weaponRegistry.js";
import { resolveWeaponStats } from "../weaponResolver.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEAPONS_ROOT = path.join(__dirname, "..", "..", "..", "data", "samples", "weapons", "stuff");

function resolveWeaponFile(relPath: string) {
  const fullPath = path.join(WEAPONS_ROOT, relPath);
  const registry = buildRegistryForPath(path.dirname(fullPath), WEAPONS_ROOT);
  const ast = parse(readFileSync(fullPath, "utf-8"));
  return resolveWeaponStats(ast, registry);
}

describe("evalExpr", () => {
  it("evaluates the real gun-category penetration formula correctly", () => {
    const [node] = parse("(+ 58 (+ 1.3 (/ (- 58 40) 4.4)))");
    expect(evalExpr(node)).toBeCloseTo(58 + 1.3 + 18 / 4.4, 6);
  });

  it("returns null for non-numeric, non-operator nodes", () => {
    const [node] = parse('"not a number"');
    expect(evalExpr(node)).toBeNull();
  });
});

describe("parseInvocation", () => {
  it("detects positional args via the 'args' marker", () => {
    const [node] = parse('("penetration" args 17.3 8 4 2 0)');
    const inv = parseInvocation(node)!;
    expect(inv.name).toBe("penetration");
    expect(inv.positional).not.toBeNull();
    expect(inv.positional).toHaveLength(5);
  });

  it("detects keyword-style args", () => {
    const [node] = parse('("penetration" a(58) b(40) c(35))');
    const inv = parseInvocation(node)!;
    expect(inv.keyword).not.toBeNull();
    expect(inv.keyword!["a"]).toBeDefined();
  });
});

describe("substitute", () => {
  it("replaces %N positional placeholders", () => {
    const [template] = parse("(%0 %1)");
    const [bound] = parse("(10 20)");
    const result = substitute(template, { positional: bound.kind === "list" ? bound.items : [] });
    expect(result.kind === "list" && result.items[0].kind === "word" && result.items[0].value).toBe("10");
  });

  it("leaves unresolved %refs visibly unresolved rather than silently failing", () => {
    const [template] = parse("%missing");
    const result = substitute(template, { keyword: {} });
    expect(result.kind === "word" && result.value).toBe("%missing");
  });
});

describe("resolveWeaponStats - real weapon files", () => {
  it("resolves K98k rifle to real, cross-checkable values", () => {
    const stats = resolveWeaponFile("rifle/k98");
    expect(stats.damage).toBe(70);
    expect(stats.damageTarget).toBe("human");
    expect(stats.calibre).toBe(7.92);
    expect(stats.velocity).toBe(760);
    // k98 references both "bolt_action" (rpm 40) and "k98_rate" (rpm 50,
    // appearing later in the file) - later occurrence should win
    expect(stats.rpm).toBe(50);
  });

  it("resolves Mosin rifle differently from K98k (different rate template)", () => {
    const stats = resolveWeaponFile("rifle/mosin");
    expect(stats.damage).toBe(70);
    // real Mosin-Nagant muzzle velocity is ~865 m/s - matches historical spec
    expect(stats.velocity).toBe(865);
    expect(stats.rpm).toBe(40); // mosin's own rate, distinct from k98's 50
  });

  it("resolves a gun-category weapon with keyword args and arithmetic penetration table", () => {
    const stats = resolveWeaponFile("gun/20mm_mg151");
    expect(stats.damageTarget).toBe("armor");
    expect(stats.calibre).toBe(20);
    expect(stats.penetrationTable).not.toBeNull();
    expect(stats.penetrationTable!.length).toBeGreaterThan(0);
    // sanity: penetration should generally decrease with range for the
    // first several points (real ballistics), not verifying every point
    // since the source formula itself produces a known nonsensical
    // negative value at extreme 500m range (a real quirk in the game's
    // own data, not a resolver bug - documented in the README)
    const sorted = [...stats.penetrationTable!].sort((a, b) => a.rangeM - b.rangeM);
    expect(sorted[0].penetrationMm).toBeGreaterThan(sorted[2].penetrationMm);
  });
});
