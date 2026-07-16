import { Node } from "./ast.js";
import { findAllByHead, wordValue, numberValue } from "./treeWalk.js";

export interface ArmorVolume {
  name: string; // e.g. "body1", "mantlet2", "cupola"
  baseThickness: number;
  facings: Partial<Record<"front" | "rear" | "top" | "bottom" | "side", number>>;
  highHardness: boolean;
  castSteel: number | null; // hardness modifier, e.g. 0.8063
}

const FACING_KEYS = new Set(["front", "rear", "top", "bottom", "side"]);

// Vehicle .ext files define armor like:
//   {volume "body1"        ; Hull
//     {thickness 45 {rear 10} {bottom 20}}
//     {HighHardness}
//   }
//   {volume "mantlet2"      ; Front mantlet
//     {thickness 52}
//     {HighHardness}
//     {CastSteel 0.8063}
//   }
// The base thickness is a literal number (not a macro reference) in every
// real vehicle .ext file checked so far - this is the cleanest data source
// in the whole toolkit, no template resolution required for the numbers
// that actually matter for armor comparisons.
export function extractArmorVolumes(topLevel: Node[]): ArmorVolume[] {
  const volumeNodes = findAllByHead(topLevel, "volume");
  const volumes: ArmorVolume[] = [];

  for (const node of volumeNodes) {
    if (node.kind !== "list") continue;
    const nameNode = node.items[1];
    const name = wordValue(nameNode);
    if (!name) continue;

    let baseThickness: number | null = null;
    const facings: ArmorVolume["facings"] = {};
    let highHardness = false;
    let castSteel: number | null = null;

    for (const item of node.items.slice(2)) {
      if (item.kind !== "list") continue;
      const head = item.items[0];
      if (head?.kind !== "word") continue;

      if (head.value === "thickness") {
        baseThickness = numberValue(item.items[1]);
        for (const sub of item.items.slice(2)) {
          if (sub.kind !== "list") continue;
          const facingKey = wordValue(sub.items[0]);
          const facingVal = numberValue(sub.items[1]);
          if (facingKey && FACING_KEYS.has(facingKey) && facingVal !== null) {
            facings[facingKey as keyof ArmorVolume["facings"]] = facingVal;
          }
        }
      } else if (head.value === "HighHardness") {
        highHardness = true;
      } else if (head.value === "CastSteel") {
        castSteel = numberValue(item.items[1]);
      }
    }

    if (baseThickness !== null) {
      volumes.push({ name, baseThickness, facings, highHardness, castSteel });
    }
  }

  return volumes;
}
