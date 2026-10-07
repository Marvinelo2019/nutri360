import { clinicDateKey } from "../../lib/format";
import type { Database } from "../../types/database";

type PatientPackage = Database["public"]["Tables"]["patient_packages"]["Row"];

export type PatientPackageDisplayState =
  "active" | "exhausted" | "expired" | "cancelled";

export const patientPackageStateLabels: Record<
  PatientPackageDisplayState,
  string
> = {
  active: "Activo",
  exhausted: "Agotado",
  expired: "Vencido",
  cancelled: "Cancelado",
};

export function patientPackageDisplayState(
  patientPackage: Pick<PatientPackage, "status" | "expires_on">,
  remainingSessions: number,
  today = clinicDateKey(),
): PatientPackageDisplayState {
  if (patientPackage.status === "cancelled") return "cancelled";
  if (remainingSessions <= 0) return "exhausted";
  if (patientPackage.expires_on < today) return "expired";
  return "active";
}
