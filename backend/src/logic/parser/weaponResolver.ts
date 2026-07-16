import { Node } from "./ast.js";
import { parseInvocation } from "./invocation.js";
import { substitute, Bindings } from "./substitute.js";
import { evalExpr } from "./exprEval.js";
import { numberValue } from "./treeWalk.js";

export interface PenetrationPoint {
  rangeM: number;
  penetrationMm: number;
}

export interface ResolvedWeaponStats {
  damage: number | null;
  damageTarget: "human" | "armor" | null;
  rpm: number | null;
  penetrationTable: PenetrationPoint[] | null;
  calibre: number | null;
  velocity: number | null;
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
