import type { Database } from "@/types/database";

type Enums = Database["public"]["Enums"];

export const reminderChannelLabels: Record<Enums["reminder_channel"], string> =
  {
    email: "Correo",
    sms: "SMS",
    whatsapp: "WhatsApp",
  };

export const reminderKindLabels: Record<Enums["reminder_kind"], string> = {
  confirmation: "Confirmación",
  reminder_24h: "Recordatorio 24 h",
  reminder_2h: "Recordatorio 2 h",
};

export const reminderStatusLabels: Record<Enums["reminder_status"], string> = {
  blocked: "Requiere contacto",
  cancelled: "Cancelado",
  failed: "Falló",
  processing: "Procesando",
  queued: "Programado",
  sent: "Enviado",
};

export function reminderStatusClass(status: Enums["reminder_status"]) {
  if (status === "sent") return "bg-[var(--success-bg)] text-[var(--success)]";
  if (status === "blocked" || status === "failed")
    return "bg-[var(--danger-bg)] text-[var(--danger)]";
  if (status === "cancelled") return "bg-[#f5f2f0] text-[var(--text-muted)]";
  return "bg-[var(--brand-50)] text-[var(--brand-700)]";
}
