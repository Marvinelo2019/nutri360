"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireWorkspace } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import {
  consumeSessionSchema,
  packageDefinitionSchema,
  packageIdSchema,
  sellPackageSchema,
  type PackageFormState,
} from "./schemas";

export async function createPackageDefinitionAction(
  _state: PackageFormState,
  formData: FormData,
): Promise<PackageFormState> {
  const { workspace } = await requireWorkspace();
  const parsed = packageDefinitionSchema.safeParse({
    name: formData.get("name"),
    sessionCount: formData.get("sessionCount"),
    price: formData.get("price"),
    validityDays: formData.get("validityDays"),
  });
  if (!parsed.success)
    return { status: "error", errors: parsed.error.flatten().fieldErrors };
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("create_package_definition", {
    target_organization_id: workspace.id,
    package_name: parsed.data.name,
    package_session_count: parsed.data.sessionCount,
    package_price_centavos: parsed.data.price,
    package_validity_days: parsed.data.validityDays,
  });
  if (error)
    return { status: "error", message: "No pudimos crear el paquete." };
  revalidatePath("/paquetes");
  return { status: "success", message: "Paquete creado." };
}

export async function setPackageActiveAction(
  packageId: string,
  nextActive: boolean,
) {
  await requireWorkspace();
  if (!packageIdSchema.safeParse(packageId).success) return;
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("set_package_active", {
    target_package_id: packageId,
    next_active: nextActive,
  });
  if (!error) revalidatePath("/paquetes");
}

export async function sellPatientPackageAction(
  _state: PackageFormState,
  formData: FormData,
): Promise<PackageFormState> {
  await requireWorkspace();
  const parsed = sellPackageSchema.safeParse({
    patientId: formData.get("patientId"),
    packageId: formData.get("packageId"),
    purchaseDate: formData.get("purchaseDate"),
    createPayment: formData.get("createPayment") === "on",
    paymentMethod: formData.get("paymentMethod"),
    paymentStatus: formData.get("paymentStatus"),
    paymentReference: formData.get("paymentReference") || undefined,
  });
  if (!parsed.success)
    return { status: "error", errors: parsed.error.flatten().fieldErrors };
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("sell_patient_package", {
    target_patient_id: parsed.data.patientId,
    target_package_id: parsed.data.packageId,
    purchase_date: parsed.data.purchaseDate,
    create_linked_payment: parsed.data.createPayment,
    linked_payment_method: parsed.data.paymentMethod,
    linked_payment_status: parsed.data.paymentStatus,
    linked_payment_reference: parsed.data.paymentReference || null,
  });
  if (error)
    return { status: "error", message: "No pudimos registrar la venta." };
  revalidatePath("/paquetes");
  revalidatePath("/pagos");
  revalidatePath("/dashboard");
  redirect(`/paquetes/${data}`);
}

export async function consumePackageSessionAction(
  _state: PackageFormState,
  formData: FormData,
): Promise<PackageFormState> {
  await requireWorkspace();
  const parsed = consumeSessionSchema.safeParse({
    patientPackageId: formData.get("patientPackageId"),
    appointmentId: formData.get("appointmentId"),
  });
  if (!parsed.success)
    return { status: "error", errors: parsed.error.flatten().fieldErrors };
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("consume_package_session", {
    target_patient_package_id: parsed.data.patientPackageId,
    target_appointment_id: parsed.data.appointmentId,
  });
  if (error)
    return {
      status: "error",
      message: "No pudimos descontar la sesión. Revisa el saldo y la cita.",
    };
  revalidatePath(`/paquetes/${parsed.data.patientPackageId}`);
  revalidatePath("/paquetes");
  return { status: "success", message: "Sesión descontada." };
}

export async function reversePackageSessionAction(
  patientPackageId: string,
  consumptionId: string,
) {
  await requireWorkspace();
  if (
    !packageIdSchema.safeParse(patientPackageId).success ||
    !packageIdSchema.safeParse(consumptionId).success
  )
    return;
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("reverse_package_session", {
    target_consumption_id: consumptionId,
  });
  if (!error) {
    revalidatePath(`/paquetes/${patientPackageId}`);
    revalidatePath("/paquetes");
  }
}

export async function cancelPatientPackageAction(patientPackageId: string) {
  await requireWorkspace();
  if (!packageIdSchema.safeParse(patientPackageId).success) return;
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("cancel_patient_package", {
    target_patient_package_id: patientPackageId,
  });
  if (!error) {
    revalidatePath(`/paquetes/${patientPackageId}`);
    revalidatePath("/paquetes");
  }
}
