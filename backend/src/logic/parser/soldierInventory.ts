import { Node } from "./ast.js";
import { findAllByHead, wordValue } from "./treeWalk.js";

// Non-combat / non-primary items that appear in every soldier's inventory
// regardless of role - grenades, bandages, entrenching tools, headgear.
// Filtering these out leaves the actual weapon(s) the soldier carries.
const NON_WEAPON_PATTERNS = [
  /grenade/i,
  /bandage/i,
  /shovel/i,
  /fieldcap/i,
  /helmet/i,
  /sidecap/i,
  /stalhelm/i,
  /binocular/i,
  /ammo$/i, // bare ammo entries like "rifle_ger clip ammo" (the weapon itself, not ammo, is what we want)
  /^p38$/i, // sidearms carried alongside a primary weapon - real but secondary
  /clip ammo/i,
  /belt ammo/i,
];

export interface SoldierInventory {
  items: string[]; // all inventory item ids, raw
  primaryWeapon: string | null; // best-effort filter to the main weapon
}

// Breed files have a single top-level {breed ... {inventory {item "k98" filled} {item "..."} ...}} block.
export function extractSoldierInventory(topLevel: Node[]): SoldierInventory {
  const inventoryBlocks = findAllByHead(topLevel, "inventory");
  const items: string[] = [];

  for (const block of inventoryBlocks) {
    if (block.kind !== "list") continue;
    for (const child of block.items) {
      if (child.kind !== "list") continue;
      if (child.items[0]?.kind !== "word" || child.items[0].value !== "item") continue;
      const id = wordValue(child.items[1]);
      if (id) items.push(id);
    }
  }

  const primaryWeapon = items.find((i) => !NON_WEAPON_PATTERNS.some((p) => p.test(i))) ?? null;

  return { items, primaryWeapon };
}
