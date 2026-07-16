import { describe, it, expect } from "vitest";
import { loadAllVehicles } from "../vehicleLoader.js";

describe("loadAllVehicles", () => {
  const all = loadAllVehicles();

  it("loads vehicle data for all 5 factions", () => {
    const factions = [...all.keys()].sort();
    expect(factions).toEqual(["eng", "fin", "ger", "rus", "usa"]);
  });

  it("matches the hand-verified su85 armor values exactly", () => {
    const rus = all.get("rus") ?? [];
    const su85 = rus.find((v) => v.id === "su85");
    expect(su85).toBeDefined();
    expect(su85!.mass).toBe(29600);
    expect(su85!.primaryWeapon).toBe("85mm_d5s");
    expect(su85!.mobility).toEqual({ speed: 55, weight: 29.6, power: 500, range: 210 });

    const nose = su85!.armor.find((a) => a.name === "body3");
    expect(nose).toBeDefined();
    expect(nose!.baseThickness).toBe(45);
    expect(nose!.facings.front).toBe(100);
    expect(nose!.facings.top).toBe(60);
    expect(nose!.castSteel).toBe(0.8063);

    const mantlet = su85!.armor.find((a) => a.name === "mantlet2");
    expect(mantlet!.baseThickness).toBe(52);

    const cupola = su85!.armor.find((a) => a.name === "cupola");
    expect(cupola!.baseThickness).toBe(20);
  });

  it("filters out wreck/destroyed decoration variants", () => {
    for (const [, vehicles] of all) {
      const wrecks = vehicles.filter((v) => v.id.endsWith("_x") || v.id.endsWith("_xx"));
      expect(wrecks).toHaveLength(0);
    }
  });

  it("identifies primaryWeapon excluding known non-combat slots", () => {
    for (const [, vehicles] of all) {
      for (const v of vehicles) {
        if (v.primaryWeapon) {
          expect(v.primaryWeapon.toLowerCase()).not.toMatch(/vision|searchlight|periscope/);
        }
      }
    }
  });

  it("resolves gun stats for vehicles with a real gun (su85 -> 85mm_d5s -> 85mm_zis53 chain)", () => {
    const rus = all.get("rus") ?? [];
    const su85 = rus.find((v) => v.id === "su85");
    expect(su85?.gunStats).not.toBeNull();
    expect(su85?.gunStats?.calibre).toBe(85);
    const aphe = su85?.gunStats?.shells.find((s) => s.shellType === "aphe");
    expect(aphe?.penetrationTable?.find((p) => p.rangeM === 30)?.penetrationMm).toBe(142);
  });
});
