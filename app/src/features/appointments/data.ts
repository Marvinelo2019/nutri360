import "server-only";

import { requireWorkspace } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { clinicDateKey } from "@/lib/format";

export async function getDailyAgenda(date = clinicDateKey()) {
  const { workspace } = await requireWorkspace();
  const supabase = await createServerSupabaseClient();
  const { data: appointments, error } = await supabase.rpc(
    "list_appointments_for_local_date",
    { target_date: date, target_organization_id: workspace.id },
  );
  if (error) throw error;

  const patientIds = [...new Set(appointments.map((item) => item.patient_id))];
  const [{ data: patients }, { data: professionals }] = await Promise.all([
    patientIds.length
      ? supabase
          .from("patients")
          .select("id, first_name, last_name, phone_e164")
          .in("id", patientIds)
      : Promise.resolve({ data: [] }),
    supabase.rpc("list_scheduling_professionals", {
      target_organization_id: workspace.id,
    }),
  ]);

  const patientMap = new Map(
    (patients ?? []).map((patient) => [patient.id, patient]),
  );
  const professionalMap = new Map(
    (professionals ?? []).map((professional) => [
      professional.user_id,
      professional,
    ]),
  );
  return appointments.map((appointment) => ({
    ...appointment,
    patient: patientMap.get(appointment.patient_id) ?? null,
    professional: professionalMap.get(appointment.professional_user_id) ?? null,
  }));
}

export async function getSchedulingOptions() {
  const { workspace } = await requireWorkspace();
  const supabase = await createServerSupabaseClient();
  const [
    { data: patients, error: patientError },
    { data: professionals, error: professionalError },
  ] = await Promise.all([
    supabase
      .from("patients")
      .select("id, first_name, last_name")
      .eq("organization_id", workspace.id)
      .eq("status", "active")
      .is("deleted_at", null)
      .order("first_name"),
    supabase.rpc("list_scheduling_professionals", {
      target_organization_id: workspace.id,
    }),
  ]);
  if (patientError) throw patientError;
  if (professionalError) throw professionalError;
  return { patients: patients ?? [], professionals: professionals ?? [] };
}

export async function getTodayAppointmentCount() {
  const appointments = await getDailyAgenda();
  return appointments.filter(
    (appointment) => !["cancelled", "rescheduled"].includes(appointment.status),
  ).length;
}
