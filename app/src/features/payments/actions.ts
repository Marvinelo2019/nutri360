"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireWorkspace } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

import { paymentSchema, type PaymentFormState } from "./schemas";

export async function createPaymentAction(
  _state: PaymentFormState,
  formData: FormData,
): Promise<PaymentFormState> {
  await requireWorkspace();
  const parsed = paymentSchema.safeParse({
    patientId: formData.get("patientId"),
    amount: formData.get("amount"),
    method: formData.get("method"),
    status: formData.get("status"),
    date: formData.get("date"),
    reference: formData.get("reference"),
  });
  if (!parsed.success)
    return { status: "error", errors: parsed.error.flatten().fieldErrors };
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("create_payment", {
    target_patient_id: parsed.data.patientId,
    payment_amount_centavos: parsed.data.amount,
    payment_method: parsed.data.method,
    payment_status: parsed.data.status,
    payment_date: parsed.data.date,
    payment_reference: parsed.data.reference || null,
  });
  if (error)
    return { status: "error", message: "No pudimos registrar el pago." };
  revalidatePath("/pagos");
  revalidatePath("/dashboard");
  redirect("/pagos");
}

export async function changePaymentStatusAction(
  paymentId: string,
  nextStatus: Database["public"]["Enums"]["payment_status"],
) {
  await requireWorkspace();
  if (
    !z.uuid().safeParse(paymentId).success ||
    !z.enum(["paid", "voided", "refunded"]).safeParse(nextStatus).success
  )
    return;
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("change_payment_status", {
    target_payment_id: paymentId,
    next_status: nextStatus,
  });
  if (!error) {
    revalidatePath("/pagos");
    revalidatePath("/dashboard");
  }
}
