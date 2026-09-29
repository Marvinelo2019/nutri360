export const bmiLabels = {
  severe_thinness: "Delgadez severa",
  moderate_thinness: "Delgadez moderada",
  underweight: "Bajo peso",
  normal: "Peso normal",
  overweight: "Sobrepeso",
  obesity_i: "Obesidad grado I",
  obesity_ii: "Obesidad grado II",
  obesity_iii: "Obesidad grado III",
} as const;

export type BmiClassification = keyof typeof bmiLabels;

function round(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function classifyBmi(bmi: number): BmiClassification {
  if (bmi < 16) return "severe_thinness";
  if (bmi < 17) return "moderate_thinness";
  if (bmi < 18.5) return "underweight";
  if (bmi < 25) return "normal";
  if (bmi < 30) return "overweight";
  if (bmi < 35) return "obesity_i";
  if (bmi < 40) return "obesity_ii";
  return "obesity_iii";
}

export function calculateAdultAnthropometry(
  weightKg: number,
  heightCm: number,
) {
  const heightM = heightCm / 100;
  const bmi = round(weightKg / heightM ** 2);

  return {
    bmi,
    classification: classifyBmi(bmi),
    weightLb: round(weightKg * 2.20462),
    normalWeightMinKg: round(18.5 * heightM ** 2),
    normalWeightMaxKg: round(24.9 * heightM ** 2),
  };
}
