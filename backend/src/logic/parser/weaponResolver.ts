import { Node } from "./ast.js";
import { parseInvocation } from "./invocation.js";
import { substitute, Bindings } from "./substitute.js";
import { evalExpr } from "./exprEval.js";
import { numberValue, wordValue } from "./treeWalk.js";

export interface PenetrationPoint {
  rangeM: number;
  penetrationMm: number;
}

export interface ShellStats {
  shellType: string; // e.g. "aphe", "apcr", "he"
  damage: number | null; // resolved armor damage modifier for this shell
  penetrationTable: PenetrationPoint[] | null;
}

export interface ResolvedWeaponStats {
  damage: number | null;
  damageTarget: "human" | "armor" | null;
  rpm: number | null;
  penetrationTable: PenetrationPoint[] | null;
  calibre: number | null;
  velocity: number | null;
  shells: ShellStats[]; // for guns with multiple ammo types (AP/APCR/HE) - empty for simple infantry weapons
  unresolvedTemplates: string[]; // template names referenced but not found in the registry - honest gap tracking, not hidden
}

function invocationBindings(node: Node): Bindings | null {
  const inv = parseInvocation(node);
  if (!inv) return null;
  return inv.positional ? { positional: inv.positional } : { keyword: inv.keyword ?? {} };
}

function resolvePenetrationTable(templateBody: Node[], bindings: Bindings): PenetrationPoint[] | null {
  for (const node of templateBody) {
    if (node.kind !== "list") continue;
    if (node.items[0]?.kind !== "word" || node.items[0].value !== "projectileDamageTable") continue;

    const points: PenetrationPoint[] = [];
    for (const cell of node.items.slice(1)) {
      if (cell.kind !== "list" || cell.items.length !== 2) continue;
      const rangeM = numberValue(cell.items[0]);
      const substituted = substitute(cell.items[1], bindings);
      const penetrationMm = substituted.kind === "word" ? numberValue(substituted) : evalExpr(substituted);
      if (rangeM !== null && penetrationMm !== null) {
        points.push({ rangeM, penetrationMm });
      }
    }
    return points.length > 0 ? points : null;
  }
  return null;
}

// Handles the {parameters "%shell" <items>} wrapper pattern used by
// gun-category templates (penetration_long/medium/short, armor health
// custom) - after substitution the wrapper's tag becomes a literal shell
// name (e.g. "aphe"), and <items> contains the actual per-shell fields
// (projectileDamageTable and/or minimumDamageModifier), which may still
// need arithmetic evaluation on BOTH the table's range keys and
// penetration values (verified: some range keys are literal numbers,
// others are %range or "(+ %range 15)" expressions - not just the values).
function extractShellResult(
  substitutedBody: Node[]
): { shellType: string; damage: number | null; table: PenetrationPoint[] | null } | null {
  for (const node of substitutedBody) {
    if (node.kind !== "list" || node.items[0]?.kind !== "word" || node.items[0].value !== "parameters") continue;
    const shellType = wordValue(node.items[1]);
    if (!shellType) continue;

    let damage: number | null = null;
    let table: PenetrationPoint[] | null = null;

    for (const inner of node.items.slice(2)) {
      if (inner.kind !== "list" || inner.items[0]?.kind !== "word") continue;
      const key = inner.items[0].value;

      if (key === "minimumDamageModifier" || key === "healthDamage") {
        const val = evalExpr(inner.items[1]);
        if (val !== null) damage = val;
      } else if (key === "projectileDamageTable") {
        const points: PenetrationPoint[] = [];
        for (const cell of inner.items.slice(1)) {
          if (cell.kind !== "list" || cell.items.length !== 2) continue;
          const rangeM = cell.items[0].kind === "word" ? numberValue(cell.items[0]) : evalExpr(cell.items[0]);
          const penetrationMm = cell.items[1].kind === "word" ? numberValue(cell.items[1]) : evalExpr(cell.items[1]);
          if (rangeM !== null && penetrationMm !== null) {
            points.push({ rangeM, penetrationMm });
          }
        }
        if (points.length > 0) table = points;
      }
    }

    return { shellType, damage, table };
  }
  return null;
}

const SHELL_TEMPLATE_NAMES = new Set([
  "penetration_long",
  "penetration_medium",
  "penetration_short",
  "armor health custom",
]);

// Processes a weapon's own top-level body (already parsed), expanding any
// call that matches a template in `registry` (scoped to this weapon's own
// category folder). Fields are resolved in file order, with later
// occurrences overriding earlier ones for scalar fields (damage, rpm) -
// this matches the real observed case where k98's own file references
// both "bolt_action" (sets rpm 40) and "k98_rate" (sets rpm 50, appearing
// after "bolt_action" in file order) and the later one should win.
export function resolveWeaponStats(
  topLevel: Node[],
  registry: Map<string, Node[]>,
  maxDepth = 8
): ResolvedWeaponStats {
  const stats: ResolvedWeaponStats = {
    damage: null,
    damageTarget: null,
    rpm: null,
    penetrationTable: null,
    calibre: null,
    velocity: null,
    shells: [],
    unresolvedTemplates: [],
  };

  function process(items: Node[], depth: number) {
    if (depth > maxDepth) return;

    for (const item of items) {
      if (item.kind !== "list") continue;

      // literal field, e.g. {calibre 7.92}
      if (item.bracket === "{" && item.items[0]?.kind === "word") {
        const key = item.items[0].value;
        if (key === "calibre") stats.calibre = numberValue(item.items[1]);
      }

      // call form: ("name" ...)
      let handledAsCall = false;
      if (item.bracket === "(" && item.items[0]?.kind === "string") {
        const name = item.items[0].value;
        const bindings = invocationBindings(item);
        handledAsCall = true;

        if (name === "human health" || name === "armor health") {
          const dmgNode = bindings?.keyword?.["damage"];
          if (dmgNode) {
            const val = dmgNode.kind === "word" ? numberValue(dmgNode) : evalExpr(dmgNode);
            if (val !== null) {
              stats.damage = val;
              stats.damageTarget = name === "human health" ? "human" : "armor";
            }
          }
        } else if (name === "fire rate") {
          const rpmNode = bindings?.keyword?.["rpm"];
          if (rpmNode) {
            const val = rpmNode.kind === "word" ? numberValue(rpmNode) : evalExpr(rpmNode);
            if (val !== null) stats.rpm = val;
          }
        } else if (name === "velocity") {
          const mpsNode = bindings?.keyword?.["mps"];
          if (mpsNode) stats.velocity = numberValue(mpsNode);
        } else if (name === "penetration" && bindings) {
          const body = registry.get("penetration");
          if (body) {
            const table = resolvePenetrationTable(body, bindings);
            if (table) stats.penetrationTable = table;
          } else {
            stats.unresolvedTemplates.push("penetration");
          }
        } else if (SHELL_TEMPLATE_NAMES.has(name) && bindings) {
          const body = registry.get(name);
          if (body) {
            const substituted = body.map((n) => substitute(n, bindings));
            const result = extractShellResult(substituted);
            if (result) {
              let entry = stats.shells.find((s) => s.shellType === result.shellType);
              if (!entry) {
                entry = { shellType: result.shellType, damage: null, penetrationTable: null };
                stats.shells.push(entry);
              }
              if (result.damage !== null) entry.damage = result.damage;
              if (result.table !== null) entry.penetrationTable = result.table;
            }
          } else {
            stats.unresolvedTemplates.push(name);
          }
        } else if (registry.has(name) && bindings) {
          const body = registry.get(name)!;
          const substituted = body.map((n) => substitute(n, bindings));
          process(substituted, depth + 1);
        } else if (!registry.has(name)) {
          stats.unresolvedTemplates.push(name);
        }
      }

      // Always recurse into children too - the whole file is wrapped in one
      // outer {from "pattern rifle" ...} block (or similar), so top-level
      // calls are actually nested one level deep inside that wrapper, not
      // literally at the top of the parsed array. Skip re-descending into
      // nodes we already expanded via template substitution above (their
      // substituted content was already processed by the recursive call).
      if (!handledAsCall || !registry.has((item.items[0] as any)?.value)) {
        process(item.items, depth + 1);
      }
    }
  }

  process(topLevel, 0);
  return stats;
}
