import type { Database } from "@/types/database";

export const appointmentStatusLabels: Record<
  Database["public"]["Enums"]["appointment_status"],
  string
> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  completed: "Atendida",
  no_show: "No asistió",
  cancelled: "Cancelada",
  rescheduled: "Reprogramada",
};

export const appointmentModalityLabels: Record<
  Database["public"]["Enums"]["appointment_modality"],
  string
> = {
  in_person: "Presencial",
  video: "Videollamada",
  phone: "Llamada",
};
