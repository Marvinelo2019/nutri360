import "server-only";

import { requireWorkspace } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getReminderCenter() {
  const { workspace } = await requireWorkspace();
  const supabase = await createServerSupabaseClient();
  const [{ data: settings, error: settingsError }, { data: reminders, error }] =
    await Promise.all([
      supabase
        .from("reminder_settings")
        .select("*")
        .eq("organization_id", workspace.id)
        .single(),
      supabase
        .from("appointment_reminders")
        .select("*")
        .eq("organization_id", workspace.id)
        .order("scheduled_at", { ascending: false })
        .limit(100),
    ]);
  if (settingsError || error) throw settingsError ?? error;

  const appointmentIds = [
    ...new Set((reminders ?? []).map((reminder) => reminder.appointment_id)),
  ];
  const { data: appointments, error: appointmentError } = appointmentIds.length
    ? await supabase
        .from("appointments")
        .select("id, patient_id, starts_at, status")
        .in("id", appointmentIds)
    : { data: [], error: null };
  if (appointmentError) throw appointmentError;

  const patientIds = [
    ...new Set(
      (appointments ?? []).map((appointment) => appointment.patient_id),
    ),
  ];
  const { data: patients, error: patientError } = patientIds.length
    ? await supabase
        .from("patients")
        .select("id, first_name, last_name")
        .in("id", patientIds)
    : { data: [], error: null };
  if (patientError) throw patientError;

  const appointmentMap = new Map(
    (appointments ?? []).map((appointment) => [appointment.id, appointment]),
  );
  const patientMap = new Map(
    (patients ?? []).map((patient) => [patient.id, patient]),
  );

  return {
    reminders: (reminders ?? []).map((reminder) => {
      const appointment = appointmentMap.get(reminder.appointment_id) ?? null;
      const patient = appointment
        ? (patientMap.get(appointment.patient_id) ?? null)
        : null;
      return { ...reminder, appointment, patient };
    }),
    settings,
    workspace,
  };
}
