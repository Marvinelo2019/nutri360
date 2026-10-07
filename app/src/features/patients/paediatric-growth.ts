export const paediatricBmiLabels: Record<string, string> = {
  severe_thinness: "Delgadez severa",
  thinness: "Delgadez",
  expected_range: "Rango esperado",
  risk_of_overweight: "Riesgo de sobrepeso",
  overweight: "Sobrepeso",
  obesity: "Obesidad",
};

export const paediatricHeightLabels: Record<string, string> = {
  severe_stunting: "Talla baja severa",
  stunting: "Talla baja",
  expected_range: "Rango esperado",
  tall: "Talla alta",
};

export const paediatricWeightLabels: Record<string, string> = {
  severe_underweight: "Peso bajo severo",
  underweight: "Peso bajo",
  not_underweight: "Sin peso bajo por este indicador",
};

export function isUnder18(birthDate: string, referenceDate = new Date()) {
  const [birthYear, birthMonth, birthDay] = birthDate.split("-").map(Number);
  const age =
    referenceDate.getFullYear() -
    birthYear -
    (referenceDate.getMonth() + 1 < birthMonth ||
    (referenceDate.getMonth() + 1 === birthMonth &&
      referenceDate.getDate() < birthDay)
      ? 1
      : 0);
  return age < 18;
}
