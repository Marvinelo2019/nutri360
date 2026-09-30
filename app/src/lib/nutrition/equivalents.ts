export type EquivalentSnapshot = {
  equivalent_count: number | null;
  equivalent_energy_kcal: number | null;
  equivalent_protein_g: number | null;
  equivalent_carbohydrate_g: number | null;
  equivalent_fat_g: number | null;
};

export function calculateEquivalentTotals(items: EquivalentSnapshot[]) {
  return items.reduce(
    (totals, item) => {
      if (
        item.equivalent_count == null ||
        item.equivalent_energy_kcal == null ||
        item.equivalent_protein_g == null ||
        item.equivalent_carbohydrate_g == null ||
        item.equivalent_fat_g == null
      ) {
        return totals;
      }
      return {
        itemCount: totals.itemCount + 1,
        energy:
          totals.energy + item.equivalent_count * item.equivalent_energy_kcal,
        protein:
          totals.protein + item.equivalent_count * item.equivalent_protein_g,
        carbohydrate:
          totals.carbohydrate +
          item.equivalent_count * item.equivalent_carbohydrate_g,
        fat: totals.fat + item.equivalent_count * item.equivalent_fat_g,
      };
    },
    { itemCount: 0, energy: 0, protein: 0, carbohydrate: 0, fat: 0 },
  );
}
