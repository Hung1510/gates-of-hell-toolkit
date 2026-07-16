import { loadAllVehicles } from "./data/vehicleLoader.js";

const all = loadAllVehicles();

console.log("=== Vehicle counts per faction ===");
for (const [faction, vehicles] of all) {
  const withWeapons = vehicles.filter((v) => v.weapons.length > 0).length;
  const withArmor = vehicles.filter((v) => v.armor.length > 0).length;
  const withMobility = vehicles.filter((v) => v.mobility !== null).length;
  console.log(
    `  ${faction}: ${vehicles.length} vehicles, ${withWeapons} with weapon refs, ${withArmor} with armor data, ${withMobility} with mobility stats`
  );
}

console.log("\n=== Cross-check: su85 (hand-verified earlier) ===");
const rus = all.get("rus") ?? [];
const su85 = rus.find((v) => v.id === "su85");
console.log(JSON.stringify(su85, null, 2));

console.log("\n=== Sample from each faction ===");
for (const [faction, vehicles] of all) {
  const sample = vehicles.find((v) => v.armor.length > 0 && v.weapons.length > 0);
  if (sample) {
    console.log(`  ${faction}: ${sample.id} - weapons=[${sample.weapons.join(", ")}], armor volumes=${sample.armor.length}, mass=${sample.mass}`);
  } else {
    console.log(`  ${faction}: no vehicle with both armor+weapon data found`);
  }
}
