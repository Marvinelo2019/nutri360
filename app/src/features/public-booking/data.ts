import "server-only";

import { requireWorkspace } from "@/lib/auth/session";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import { consumePublicBookingRateLimit } from "./rate-limit";

export const weekdayLabels = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;

export async function getPublicBookingConfiguration() {
  const { workspace } = await requireWorkspace();
  const supabase = await createServerSupabaseClient();
  const [
    { data: settings, error: settingsError },
    { data: rules, error: rulesError },
    { data: blocks, error: blocksError },
    { data: professionals, error: professionalsError },
  ] = await Promise.all([
    supabase
      .from("public_booking_settings")
      .select("*")
      .eq("organization_id", workspace.id)
      .single(),
    supabase
      .from("availability_rules")
      .select("*")
      .eq("organization_id", workspace.id)
      .eq("is_active", true)
      .order("day_of_week")
      .order("starts_at_local"),
    supabase
      .from("availability_blocks")
      .select("*")
      .eq("organization_id", workspace.id)
      .gte("ends_at", new Date().toISOString())
      .order("starts_at")
      .limit(30),
    supabase.rpc("list_scheduling_professionals", {
      target_organization_id: workspace.id,
    }),
  ]);
  if (settingsError || rulesError || blocksError || professionalsError) {
    throw settingsError ?? rulesError ?? blocksError ?? professionalsError;
  }
  return {
    blocks: blocks ?? [],
    professionals: professionals ?? [],
    rules: rules ?? [],
    settings,
    workspace,
  };
}

function dateKeyInTimeZone(timeZone: string) {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      day: "2-digit",
      month: "2-digit",
      timeZone,
      year: "numeric",
    })
      .formatToParts(new Date())
      .map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function shiftDate(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export async function getPublicBookingPageData(
  slug: string,
  requestedStart?: string,
) {
  const allowed = await consumePublicBookingRateLimit(
    `availability:${slug}`,
    30,
    300,
  );
  if (!allowed) return null;

  const supabase = createAdminSupabaseClient();
  const { data: context, error: contextError } = await supabase
    .rpc("get_public_booking_context", { booking_slug: slug })
    .maybeSingle();
  if (contextError || !context) return null;

  const today = dateKeyInTimeZone(context.clinic_timezone);
  const lastDate = shiftDate(today, context.booking_horizon_days);
  const startDate =
    requestedStart &&
    /^\d{4}-\d{2}-\d{2}$/.test(requestedStart) &&
    requestedStart >= today &&
    requestedStart <= lastDate
      ? requestedStart
      : today;

  const { data: slots, error: slotsError } = await supabase.rpc(
    "list_public_booking_slots",
    {
      booking_slug: slug,
      requested_days: 14,
      target_start_date: startDate,
    },
  );
  if (slotsError) return null;
  const next = shiftDate(startDate, 14);
  const previous = shiftDate(startDate, -14);
  return {
    context,
    nextStart: next <= lastDate ? next : null,
    previousStart:
      startDate > today ? (previous < today ? today : previous) : null,
    slots: slots ?? [],
    startDate,
  };
}
