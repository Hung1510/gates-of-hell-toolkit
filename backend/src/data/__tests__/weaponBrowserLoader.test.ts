import { describe, it, expect } from "vitest";
import { loadAllWeapons } from "../weaponBrowserLoader.js";

describe("loadAllWeapons", () => {
  const weapons = loadAllWeapons();

  it("finds a substantial number of real weapons with meaningful stats", () => {
    expect(weapons.length).toBeGreaterThan(300);
  });

  it("includes k98 with the same cross-checked values as the direct resolver test", () => {
    const k98 = weapons.find((w) => w.id === "k98" && w.category === "rifle");
    expect(k98).toBeDefined();
    expect(k98!.stats.damage).toBe(70);
    expect(k98!.stats.rpm).toBe(50);
  });

  it("resolves genuine distinct MG13 configuration variants even when their name resembles an accessory (mg13_no_bipod_x2 is a real distinct MG13 configuration, not a bipod attachment)", () => {
    const variant = weapons.find((w) => w.id === "mg13_no_bipod_x2");
    expect(variant).toBeDefined();
    expect(variant!.stats.rpm).not.toBeNull();
  });

  it("resolves PIAT's two distinct ammo types as separate shells, not one overwriting the other (real bug found and fixed: literal {parameters \"X\" ...} blocks written directly in a weapon file weren't recognized as shell-scoped, so heata's values silently clobbered heat's)", () => {
    const piat = weapons.find((w) => w.id === "piat.weapon");
    expect(piat).toBeDefined();
    expect(piat!.stats.shells).toHaveLength(2);
    const heat = piat!.stats.shells.find((s) => s.shellType === "heat");
    const heata = piat!.stats.shells.find((s) => s.shellType === "heata");
    expect(heat?.penetrationTable?.find((p) => p.rangeM === 71)?.penetrationMm).toBe(80);
    expect(heata?.penetrationTable?.find((p) => p.rangeM === 71)?.penetrationMm).toBe(100);
  });

  it("resolves panzershreck_54 by following its {from \"weapon panzershreck_43\"} reference (real convention found: 'weapon X' in a from-block means the sibling file X.weapon, distinct from template references like 'pattern X')", () => {
    const schreck = weapons.find((w) => w.id === "panzershreck_54.weapon");
    expect(schreck).toBeDefined();
    expect(schreck!.stats.calibre).toBe(88);
    expect(schreck!.stats.penetrationTable).not.toBeNull();
  });

  it("every included weapon has at least one meaningful stat (not just an empty shell)", () => {
    for (const w of weapons) {
      const hasStats = w.stats.damage !== null || w.stats.calibre !== null || w.stats.shells.length > 0;
      expect(hasStats).toBe(true);
    }
  });
});
