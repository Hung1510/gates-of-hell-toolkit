export function computeSquadCost(
  slots: { unitType: string; count: number }[],
  costById: Map<string, number | null | undefined>
): number | null {
  let total = 0;
  for (const s of slots) {
    const c = costById.get(s.unitType);
    if (c === null || c === undefined) return null;
    total += c * s.count;
  }
  return total;
}
