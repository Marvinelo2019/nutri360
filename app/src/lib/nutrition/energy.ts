export type EnergyFormula =
  "mifflin_st_jeor" | "harris_benedict_revised" | "fao_who_unu";

export type ReferenceSex = "female" | "male";
export type MacroMethod = "percentage" | "grams_per_kg";

export type EnergyInputs = {
  formula: EnergyFormula;
  sex: ReferenceSex;
  ageYears: number;
  weightKg: number;
  heightCm: number;
  activityFactor: number;
  goalAdjustmentKcal: number;
};

export type MacroInputs =
  | {
      method: "percentage";
      protein: number;
      carbohydrate: number;
      fat: number;
    }
  | {
      method: "grams_per_kg";
      protein: number;
      carbohydrate: number;
      fat: number;
    };

export const energyFormulaLabels: Record<EnergyFormula, string> = {
  mifflin_st_jeor: "Mifflin–St Jeor (1990)",
  harris_benedict_revised: "Harris–Benedict revisada (1984)",
  fao_who_unu: "FAO/WHO/UNU (1985)",
};

export const macroMethodLabels: Record<MacroMethod, string> = {
  percentage: "Porcentaje de energía",
  grams_per_kg: "Gramos por kilogramo",
};

const round = (value: number, decimals = 0) => {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

export function calculateRestingEnergyKcal({
  formula,
  sex,
  ageYears,
  weightKg,
  heightCm,
}: Omit<EnergyInputs, "activityFactor" | "goalAdjustmentKcal">) {
  if (formula === "mifflin_st_jeor") {
    return (
      9.99 * weightKg +
      6.25 * heightCm -
      4.92 * ageYears +
      (sex === "male" ? 5 : -161)
    );
  }

  if (formula === "harris_benedict_revised") {
    return sex === "male"
      ? 88.362 + 13.397 * weightKg + 4.799 * heightCm - 5.677 * ageYears
      : 447.593 + 9.247 * weightKg + 3.098 * heightCm - 4.33 * ageYears;
  }

  const heightM = heightCm / 100;
  if (sex === "male") {
    if (ageYears < 30) return 15.4 * weightKg - 27 * heightM + 717;
    if (ageYears < 60) return 11.3 * weightKg + 16 * heightM + 901;
    return 8.8 * weightKg + 1128 * heightM - 1071;
  }
  if (ageYears < 30) return 13.3 * weightKg + 334 * heightM + 35;
  if (ageYears < 60) return 8.7 * weightKg - 25 * heightM + 865;
  return 9.2 * weightKg + 637 * heightM - 302;
}

export function calculateEnergy(inputs: EnergyInputs) {
  const restingEnergyKcal = calculateRestingEnergyKcal(inputs);
  const totalEnergyKcal = restingEnergyKcal * inputs.activityFactor;
  const targetEnergyKcal = totalEnergyKcal + inputs.goalAdjustmentKcal;

  return {
    restingEnergyKcal: round(restingEnergyKcal),
    totalEnergyKcal: round(totalEnergyKcal),
    targetEnergyKcal: round(targetEnergyKcal),
  };
}

export function calculateMacros(
  targetEnergyKcal: number,
  weightKg: number,
  inputs: MacroInputs,
) {
  const result =
    inputs.method === "percentage"
      ? {
          proteinG: (targetEnergyKcal * inputs.protein) / 100 / 4,
          carbohydrateG: (targetEnergyKcal * inputs.carbohydrate) / 100 / 4,
          fatG: (targetEnergyKcal * inputs.fat) / 100 / 9,
        }
      : {
          proteinG: weightKg * inputs.protein,
          carbohydrateG: weightKg * inputs.carbohydrate,
          fatG: weightKg * inputs.fat,
        };

  const macroEnergyKcal =
    result.proteinG * 4 + result.carbohydrateG * 4 + result.fatG * 9;

  return {
    proteinG: round(result.proteinG, 1),
    carbohydrateG: round(result.carbohydrateG, 1),
    fatG: round(result.fatG, 1),
    macroEnergyKcal: round(macroEnergyKcal),
  };
}
