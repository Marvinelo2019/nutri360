import type { Database } from "@/types/database";

export const paymentStatusLabels: Record<
  Database["public"]["Enums"]["payment_status"],
  string
> = {
  pending: "Pendiente",
  paid: "Pagado",
  voided: "Anulado",
  refunded: "Reembolsado",
};
export const paymentMethodLabels: Record<
  Database["public"]["Enums"]["payment_method"],
  string
> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
  other: "Otro",
};
