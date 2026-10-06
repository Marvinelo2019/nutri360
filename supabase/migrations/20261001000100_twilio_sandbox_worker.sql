-- Restrict non-production Twilio Sandbox delivery to one organization and recipient.

create function public.claim_due_twilio_sandbox_reminders(
  target_organization_id uuid,
  sandbox_recipient_phone text,
  batch_size integer,
  worker_id text
)
returns table (
  reminder_id uuid,
  appointment_starts_at timestamptz,
  recipient_phone_e164 text,
  attempt_count smallint
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if batch_size not between 1 and 5
    or char_length(trim(worker_id)) not between 1 and 120
    or sandbox_recipient_phone !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'Invalid sandbox reminder claim';
  end if;

  update public.appointment_reminders as reminder set
    status = 'cancelled',
    locked_at = null,
    locked_by = null,
    last_error_code = 'expired'
  from public.appointments as appointment, public.patients as patient
  where appointment.id = reminder.appointment_id
    and patient.id = appointment.patient_id
    and reminder.organization_id = target_organization_id
    and reminder.channel = 'whatsapp'
    and patient.phone_e164 = sandbox_recipient_phone
    and (
      reminder.status = 'queued'
      or (
        reminder.status = 'processing'
        and reminder.locked_at < now() - interval '10 minutes'
      )
    )
    and reminder.next_attempt_at <= now()
    and (
      appointment.starts_at <= now()
      or (reminder.kind = 'confirmation' and reminder.scheduled_at < now() - interval '24 hours')
      or (reminder.kind = 'reminder_24h' and reminder.scheduled_at < now() - interval '6 hours')
      or (reminder.kind = 'reminder_2h' and reminder.scheduled_at < now() - interval '90 minutes')
    );

  return query
  with due as (
    select
      reminder.id,
      appointment.starts_at,
      patient.phone_e164
    from public.appointment_reminders as reminder
    join public.appointments as appointment
      on appointment.id = reminder.appointment_id
    join public.patients as patient on patient.id = appointment.patient_id
    where reminder.organization_id = target_organization_id
      and reminder.channel = 'whatsapp'
      and patient.phone_e164 = sandbox_recipient_phone
      and (
        reminder.status = 'queued'
        or (
          reminder.status = 'processing'
          and reminder.locked_at < now() - interval '10 minutes'
        )
      )
      and reminder.next_attempt_at <= now()
      and reminder.attempt_count < reminder.max_attempts
      and appointment.status in ('pending','confirmed')
      and appointment.starts_at > now()
      and (
        (reminder.kind = 'confirmation' and reminder.scheduled_at >= now() - interval '24 hours')
        or (reminder.kind = 'reminder_24h' and reminder.scheduled_at >= now() - interval '6 hours')
        or (reminder.kind = 'reminder_2h' and reminder.scheduled_at >= now() - interval '90 minutes')
      )
    order by reminder.next_attempt_at, reminder.created_at
    for update of reminder skip locked
    limit batch_size
  )
  update public.appointment_reminders as reminder set
    status = 'processing',
    attempt_count = reminder.attempt_count + 1,
    locked_at = now(),
    locked_by = trim(worker_id),
    last_error_code = null
  from due
  where reminder.id = due.id
  returning
    reminder.id,
    due.starts_at,
    due.phone_e164,
    reminder.attempt_count;
end;
$$;

revoke all on function public.claim_due_twilio_sandbox_reminders(uuid,text,integer,text) from public;
grant execute on function public.claim_due_twilio_sandbox_reminders(uuid,text,integer,text) to service_role;
