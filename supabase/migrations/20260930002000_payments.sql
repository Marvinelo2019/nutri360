-- Administrative patient payments stored in integer centavos.

create type public.payment_status as enum ('pending', 'paid', 'voided', 'refunded');
create type public.payment_method as enum ('cash', 'card', 'transfer', 'other');

alter table public.appointments add constraint appointments_id_org_patient_key
  unique (id, organization_id, patient_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  patient_id uuid not null,
  appointment_id uuid,
  amount_centavos integer not null check (amount_centavos between 1 and 100000000),
  method public.payment_method not null,
  status public.payment_status not null,
  paid_at timestamptz,
  external_reference text check (external_reference is null or char_length(external_reference) <= 100),
  recorded_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'paid' and paid_at is not null) or status <> 'paid'),
  foreign key (patient_id, organization_id)
    references public.patients (id, organization_id) on delete restrict,
  foreign key (appointment_id, organization_id, patient_id)
    references public.appointments (id, organization_id, patient_id) on delete restrict
);
create index payments_org_created_idx on public.payments (organization_id, created_at desc);
create index payments_patient_created_idx on public.payments (patient_id, created_at desc);
create index payments_org_paid_idx on public.payments (organization_id, paid_at desc) where status = 'paid';

create function private.prevent_payment_identity_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.id <> old.id or new.organization_id <> old.organization_id
    or new.patient_id <> old.patient_id or new.appointment_id is distinct from old.appointment_id
    or new.amount_centavos <> old.amount_centavos or new.method <> old.method
    or new.recorded_by <> old.recorded_by or new.created_at <> old.created_at then
    raise exception 'Payment identity and amount cannot be changed';
  end if;
  return new;
end;
$$;

create function private.audit_payment_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.audit_events (organization_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (new.organization_id, (select auth.uid()), lower(tg_op), 'payments', new.id,
    jsonb_build_object('status', new.status, 'amount_centavos', new.amount_centavos));
  return new;
end;
$$;

create trigger payments_set_updated_at before update on public.payments
  for each row execute procedure private.set_updated_at();
create trigger payments_identity_guard before update on public.payments
  for each row execute procedure private.prevent_payment_identity_change();
create trigger payments_audit after insert or update on public.payments
  for each row execute procedure private.audit_payment_change();

alter table public.payments enable row level security;
revoke all on table public.payments from anon, authenticated;
grant select on table public.payments to authenticated;
create policy payments_select_staff on public.payments for select to authenticated
  using ((select private.has_organization_role(
    organization_id, array['owner','nutritionist','assistant']::public.app_role[]
  )));

create function public.create_payment(
  target_patient_id uuid,
  payment_amount_centavos integer,
  payment_method public.payment_method,
  payment_status public.payment_status,
  payment_date date,
  payment_reference text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  patient_row public.patients;
  organization_timezone text;
  created_payment_id uuid;
  calculated_paid_at timestamptz;
begin
  select * into patient_row from public.patients where id = target_patient_id and deleted_at is null;
  if patient_row.id is null then raise exception 'Patient not found'; end if;
  if not (select private.has_organization_role(
    patient_row.organization_id, array['owner','nutritionist','assistant']::public.app_role[]
  )) then raise exception 'Payment role required'; end if;
  if payment_amount_centavos not between 1 and 100000000 then raise exception 'Invalid payment amount'; end if;
  if payment_status not in ('pending','paid') then raise exception 'Invalid initial payment status'; end if;
  select timezone into organization_timezone from public.organizations where id = patient_row.organization_id;
  if payment_status = 'paid' then
    calculated_paid_at := (payment_date::timestamp + time '12:00') at time zone organization_timezone;
  end if;
  insert into public.payments (
    organization_id, patient_id, amount_centavos, method, status, paid_at,
    external_reference, recorded_by
  ) values (
    patient_row.organization_id, patient_row.id, payment_amount_centavos,
    payment_method, payment_status, calculated_paid_at,
    nullif(trim(payment_reference), ''), (select auth.uid())
  ) returning id into created_payment_id;
  return created_payment_id;
end;
$$;

create function public.change_payment_status(target_payment_id uuid, next_status public.payment_status)
returns void language plpgsql security definer set search_path = '' as $$
declare
  payment_row public.payments;
begin
  select * into payment_row from public.payments where id = target_payment_id;
  if payment_row.id is null then raise exception 'Payment not found'; end if;
  if not (select private.has_organization_role(
    payment_row.organization_id, array['owner','nutritionist','assistant']::public.app_role[]
  )) then raise exception 'Payment role required'; end if;
  if payment_row.status in ('voided','refunded') then raise exception 'Final payment status cannot be changed'; end if;
  if payment_row.status = 'pending' and next_status not in ('paid','voided') then raise exception 'Unsupported payment status transition'; end if;
  if payment_row.status = 'paid' and next_status <> 'refunded' then raise exception 'Unsupported payment status transition'; end if;
  update public.payments
  set status = next_status,
      paid_at = case when next_status = 'paid' then now() else paid_at end
  where id = target_payment_id;
end;
$$;

revoke all on function public.create_payment(uuid,integer,public.payment_method,public.payment_status,date,text) from public;
revoke all on function public.change_payment_status(uuid,public.payment_status) from public;
grant execute on function public.create_payment(uuid,integer,public.payment_method,public.payment_status,date,text) to authenticated;
grant execute on function public.change_payment_status(uuid,public.payment_status) to authenticated;
