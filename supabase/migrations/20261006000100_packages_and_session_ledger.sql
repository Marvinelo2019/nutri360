-- Reusable consultation packages, patient purchases, and immutable session usage.

create type public.patient_package_status as enum ('active', 'cancelled');
create type public.package_usage_kind as enum ('consumption', 'reversal');

create table public.packages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  name text not null check (char_length(trim(name)) between 2 and 100),
  session_count smallint not null check (session_count between 1 and 100),
  price_centavos integer not null check (price_centavos between 1 and 100000000),
  validity_days smallint not null check (validity_days between 1 and 730),
  is_active boolean not null default true,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id)
);

create table public.patient_packages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  patient_id uuid not null,
  package_id uuid not null,
  package_name_snapshot text not null check (
    char_length(trim(package_name_snapshot)) between 2 and 100
  ),
  total_sessions smallint not null check (total_sessions between 1 and 100),
  price_centavos integer not null check (price_centavos between 1 and 100000000),
  purchased_on date not null,
  expires_on date not null,
  status public.patient_package_status not null default 'active',
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_on >= purchased_on),
  foreign key (patient_id, organization_id)
    references public.patients (id, organization_id) on delete restrict,
  foreign key (package_id, organization_id)
    references public.packages (id, organization_id) on delete restrict,
  unique (id, organization_id, patient_id)
);

alter table public.payments add column patient_package_id uuid;
alter table public.payments add constraint payments_patient_package_fkey
  foreign key (patient_package_id, organization_id, patient_id)
  references public.patient_packages (id, organization_id, patient_id) on delete restrict;
alter table public.payments add constraint payments_single_subject_check
  check (num_nonnulls(appointment_id, patient_package_id) <= 1);

create table public.package_usages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  patient_id uuid not null,
  patient_package_id uuid not null,
  appointment_id uuid not null,
  kind public.package_usage_kind not null,
  session_delta smallint not null,
  reverses_usage_id uuid,
  recorded_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  check (
    (kind = 'consumption' and session_delta = -1 and reverses_usage_id is null)
    or (kind = 'reversal' and session_delta = 1 and reverses_usage_id is not null)
  ),
  foreign key (patient_package_id, organization_id, patient_id)
    references public.patient_packages (id, organization_id, patient_id) on delete restrict,
  foreign key (appointment_id, organization_id, patient_id)
    references public.appointments (id, organization_id, patient_id) on delete restrict,
  unique (id, organization_id, patient_package_id, appointment_id),
  foreign key (reverses_usage_id, organization_id, patient_package_id, appointment_id)
    references public.package_usages (id, organization_id, patient_package_id, appointment_id)
    on delete restrict
);

create index packages_org_active_idx
  on public.packages (organization_id, is_active, created_at desc);
create index patient_packages_patient_created_idx
  on public.patient_packages (patient_id, created_at desc);
create index package_usages_package_created_idx
  on public.package_usages (patient_package_id, created_at desc);
create unique index package_usages_one_consumption_per_appointment_idx
  on public.package_usages (appointment_id) where kind = 'consumption';
create unique index package_usages_one_reversal_idx
  on public.package_usages (reverses_usage_id) where kind = 'reversal';
create unique index payments_one_per_patient_package_idx
  on public.payments (patient_package_id) where patient_package_id is not null;

create function private.prevent_package_identity_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.id <> old.id or new.organization_id <> old.organization_id
    or new.name <> old.name or new.session_count <> old.session_count
    or new.price_centavos <> old.price_centavos
    or new.validity_days <> old.validity_days
    or new.created_by <> old.created_by or new.created_at <> old.created_at then
    raise exception 'Package commercial terms cannot be changed';
  end if;
  return new;
end;
$$;

create function private.prevent_patient_package_identity_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.id <> old.id or new.organization_id <> old.organization_id
    or new.patient_id <> old.patient_id or new.package_id <> old.package_id
    or new.package_name_snapshot <> old.package_name_snapshot
    or new.total_sessions <> old.total_sessions
    or new.price_centavos <> old.price_centavos
    or new.purchased_on <> old.purchased_on or new.expires_on <> old.expires_on
    or new.created_by <> old.created_by or new.created_at <> old.created_at then
    raise exception 'Patient package purchase cannot be changed';
  end if;
  return new;
end;
$$;

create function private.reject_package_usage_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'Package usage ledger is immutable';
end;
$$;

create or replace function private.prevent_payment_identity_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.id <> old.id or new.organization_id <> old.organization_id
    or new.patient_id <> old.patient_id or new.appointment_id is distinct from old.appointment_id
    or new.patient_package_id is distinct from old.patient_package_id
    or new.amount_centavos <> old.amount_centavos or new.method <> old.method
    or new.recorded_by <> old.recorded_by or new.created_at <> old.created_at then
    raise exception 'Payment identity and amount cannot be changed';
  end if;
  return new;
end;
$$;

create function private.audit_package_definition_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.audit_events (
    organization_id, actor_user_id, action, entity_type, entity_id, metadata
  ) values (
    new.organization_id, (select auth.uid()), lower(tg_op), 'packages', new.id,
    jsonb_build_object(
      'session_count', new.session_count,
      'price_centavos', new.price_centavos,
      'is_active', new.is_active
    )
  );
  return new;
end;
$$;

create function private.audit_patient_package_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.audit_events (
    organization_id, actor_user_id, action, entity_type, entity_id, metadata
  ) values (
    new.organization_id, (select auth.uid()), lower(tg_op), 'patient_packages', new.id,
    jsonb_build_object(
      'patient_id', new.patient_id,
      'total_sessions', new.total_sessions,
      'price_centavos', new.price_centavos,
      'status', new.status
    )
  );
  return new;
end;
$$;

create function private.audit_package_usage_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.audit_events (
    organization_id, actor_user_id, action, entity_type, entity_id, metadata
  ) values (
    new.organization_id, (select auth.uid()), 'insert', 'package_usages', new.id,
    jsonb_build_object(
      'patient_package_id', new.patient_package_id,
      'appointment_id', new.appointment_id,
      'kind', new.kind,
      'session_delta', new.session_delta,
      'reverses_usage_id', new.reverses_usage_id
    )
  );
  return new;
end;
$$;

create trigger packages_set_updated_at before update on public.packages
  for each row execute procedure private.set_updated_at();
create trigger packages_identity_guard before update on public.packages
  for each row execute procedure private.prevent_package_identity_change();
create trigger packages_audit after insert or update on public.packages
  for each row execute procedure private.audit_package_definition_change();
create trigger patient_packages_set_updated_at before update on public.patient_packages
  for each row execute procedure private.set_updated_at();
create trigger patient_packages_identity_guard before update on public.patient_packages
  for each row execute procedure private.prevent_patient_package_identity_change();
create trigger patient_packages_audit after insert or update on public.patient_packages
  for each row execute procedure private.audit_patient_package_change();
create trigger package_usages_immutable before update or delete on public.package_usages
  for each row execute procedure private.reject_package_usage_change();
create trigger package_usages_audit after insert on public.package_usages
  for each row execute procedure private.audit_package_usage_insert();

alter table public.packages enable row level security;
alter table public.patient_packages enable row level security;
alter table public.package_usages enable row level security;
revoke all on table public.packages, public.patient_packages, public.package_usages
  from anon, authenticated;
grant select on table public.packages, public.patient_packages, public.package_usages
  to authenticated;

create policy packages_select_staff on public.packages for select to authenticated
  using ((select private.has_organization_role(
    organization_id, array['owner','nutritionist','assistant']::public.app_role[]
  )));
create policy patient_packages_select_staff on public.patient_packages for select to authenticated
  using ((select private.has_organization_role(
    organization_id, array['owner','nutritionist','assistant']::public.app_role[]
  )));
create policy package_usages_select_staff on public.package_usages for select to authenticated
  using ((select private.has_organization_role(
    organization_id, array['owner','nutritionist','assistant']::public.app_role[]
  )));

create function public.create_package_definition(
  target_organization_id uuid,
  package_name text,
  package_session_count integer,
  package_price_centavos integer,
  package_validity_days integer
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare created_package_id uuid;
begin
  if not (select private.has_organization_role(
    target_organization_id, array['owner','nutritionist','assistant']::public.app_role[]
  )) then raise exception 'Package role required'; end if;
  if char_length(trim(package_name)) not between 2 and 100 then
    raise exception 'Invalid package name';
  end if;
  if package_session_count not between 1 and 100 then
    raise exception 'Invalid package session count';
  end if;
  if package_price_centavos not between 1 and 100000000 then
    raise exception 'Invalid package price';
  end if;
  if package_validity_days not between 1 and 730 then
    raise exception 'Invalid package validity';
  end if;
  insert into public.packages (
    organization_id, name, session_count, price_centavos, validity_days, created_by
  ) values (
    target_organization_id, trim(package_name), package_session_count,
    package_price_centavos, package_validity_days, (select auth.uid())
  ) returning id into created_package_id;
  return created_package_id;
end;
$$;

create function public.set_package_active(target_package_id uuid, next_active boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare package_row public.packages;
begin
  select * into package_row from public.packages where id = target_package_id;
  if package_row.id is null then raise exception 'Package not found'; end if;
  if not (select private.has_organization_role(
    package_row.organization_id, array['owner','nutritionist','assistant']::public.app_role[]
  )) then raise exception 'Package role required'; end if;
  update public.packages set is_active = next_active where id = target_package_id;
end;
$$;

create function public.sell_patient_package(
  target_patient_id uuid,
  target_package_id uuid,
  purchase_date date,
  create_linked_payment boolean,
  linked_payment_method public.payment_method,
  linked_payment_status public.payment_status,
  linked_payment_reference text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  patient_row public.patients;
  package_row public.packages;
  organization_timezone text;
  clinic_today date;
  created_patient_package_id uuid;
  calculated_paid_at timestamptz;
begin
  select * into patient_row from public.patients
  where id = target_patient_id and deleted_at is null;
  if patient_row.id is null then raise exception 'Patient not found'; end if;
  if not (select private.has_organization_role(
    patient_row.organization_id, array['owner','nutritionist','assistant']::public.app_role[]
  )) then raise exception 'Package role required'; end if;
  select * into package_row from public.packages
  where id = target_package_id and organization_id = patient_row.organization_id;
  if package_row.id is null then raise exception 'Package not found'; end if;
  if not package_row.is_active then raise exception 'Package is inactive'; end if;
  select timezone into organization_timezone from public.organizations
  where id = patient_row.organization_id;
  clinic_today := (now() at time zone organization_timezone)::date;
  if purchase_date > clinic_today then raise exception 'Purchase date cannot be in the future'; end if;
  if create_linked_payment and linked_payment_status not in ('pending','paid') then
    raise exception 'Invalid initial payment status';
  end if;
  insert into public.patient_packages (
    organization_id, patient_id, package_id, package_name_snapshot,
    total_sessions, price_centavos, purchased_on, expires_on, created_by
  ) values (
    patient_row.organization_id, patient_row.id, package_row.id, package_row.name,
    package_row.session_count, package_row.price_centavos, purchase_date,
    purchase_date + package_row.validity_days, (select auth.uid())
  ) returning id into created_patient_package_id;
  if create_linked_payment then
    if linked_payment_status = 'paid' then
      calculated_paid_at := (purchase_date::timestamp + time '12:00')
        at time zone organization_timezone;
    end if;
    insert into public.payments (
      organization_id, patient_id, patient_package_id, amount_centavos,
      method, status, paid_at, external_reference, recorded_by
    ) values (
      patient_row.organization_id, patient_row.id, created_patient_package_id,
      package_row.price_centavos, linked_payment_method, linked_payment_status,
      calculated_paid_at, nullif(trim(linked_payment_reference), ''), (select auth.uid())
    );
  end if;
  return created_patient_package_id;
end;
$$;

create function public.consume_package_session(
  target_patient_package_id uuid,
  target_appointment_id uuid
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  patient_package_row public.patient_packages;
  appointment_row public.appointments;
  organization_timezone text;
  appointment_date date;
  remaining_sessions integer;
  created_usage_id uuid;
begin
  select * into patient_package_row from public.patient_packages
  where id = target_patient_package_id for update;
  if patient_package_row.id is null then raise exception 'Patient package not found'; end if;
  if not (select private.has_organization_role(
    patient_package_row.organization_id,
    array['owner','nutritionist','assistant']::public.app_role[]
  )) then raise exception 'Package role required'; end if;
  if patient_package_row.status <> 'active' then raise exception 'Patient package is not active'; end if;
  select * into appointment_row from public.appointments
  where id = target_appointment_id
    and organization_id = patient_package_row.organization_id
    and patient_id = patient_package_row.patient_id;
  if appointment_row.id is null then raise exception 'Appointment not found'; end if;
  if appointment_row.status <> 'completed' then raise exception 'Appointment must be completed'; end if;
  select timezone into organization_timezone from public.organizations
  where id = patient_package_row.organization_id;
  appointment_date := (appointment_row.starts_at at time zone organization_timezone)::date;
  if appointment_date < patient_package_row.purchased_on
    or appointment_date > patient_package_row.expires_on then
    raise exception 'Appointment is outside package validity';
  end if;
  select patient_package_row.total_sessions + coalesce(sum(session_delta), 0)
    into remaining_sessions
  from public.package_usages where patient_package_id = patient_package_row.id;
  if remaining_sessions <= 0 then raise exception 'Patient package has no remaining sessions'; end if;
  insert into public.package_usages (
    organization_id, patient_id, patient_package_id, appointment_id,
    kind, session_delta, recorded_by
  ) values (
    patient_package_row.organization_id, patient_package_row.patient_id,
    patient_package_row.id, appointment_row.id, 'consumption', -1, (select auth.uid())
  ) returning id into created_usage_id;
  return created_usage_id;
exception
  when unique_violation then
    raise exception 'Appointment already consumed a package session';
end;
$$;

create function public.reverse_package_session(target_consumption_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  consumption_row public.package_usages;
  created_reversal_id uuid;
begin
  select * into consumption_row from public.package_usages
  where id = target_consumption_id and kind = 'consumption' for update;
  if consumption_row.id is null then raise exception 'Package consumption not found'; end if;
  if not (select private.has_organization_role(
    consumption_row.organization_id,
    array['owner','nutritionist','assistant']::public.app_role[]
  )) then raise exception 'Package role required'; end if;
  if exists (
    select 1 from public.package_usages where reverses_usage_id = consumption_row.id
  ) then raise exception 'Package consumption is already reversed'; end if;
  insert into public.package_usages (
    organization_id, patient_id, patient_package_id, appointment_id,
    kind, session_delta, reverses_usage_id, recorded_by
  ) values (
    consumption_row.organization_id, consumption_row.patient_id,
    consumption_row.patient_package_id, consumption_row.appointment_id,
    'reversal', 1, consumption_row.id, (select auth.uid())
  ) returning id into created_reversal_id;
  return created_reversal_id;
exception
  when unique_violation then
    raise exception 'Package consumption is already reversed';
end;
$$;

create function public.cancel_patient_package(target_patient_package_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare patient_package_row public.patient_packages;
begin
  select * into patient_package_row from public.patient_packages
  where id = target_patient_package_id;
  if patient_package_row.id is null then raise exception 'Patient package not found'; end if;
  if not (select private.has_organization_role(
    patient_package_row.organization_id,
    array['owner','nutritionist','assistant']::public.app_role[]
  )) then raise exception 'Package role required'; end if;
  if patient_package_row.status = 'cancelled' then
    raise exception 'Patient package is already cancelled';
  end if;
  update public.patient_packages set status = 'cancelled'
  where id = target_patient_package_id;
end;
$$;

revoke all on function public.create_package_definition(uuid,text,integer,integer,integer) from public;
revoke all on function public.set_package_active(uuid,boolean) from public;
revoke all on function public.sell_patient_package(uuid,uuid,date,boolean,public.payment_method,public.payment_status,text) from public;
revoke all on function public.consume_package_session(uuid,uuid) from public;
revoke all on function public.reverse_package_session(uuid) from public;
revoke all on function public.cancel_patient_package(uuid) from public;
grant execute on function public.create_package_definition(uuid,text,integer,integer,integer) to authenticated;
grant execute on function public.set_package_active(uuid,boolean) to authenticated;
grant execute on function public.sell_patient_package(uuid,uuid,date,boolean,public.payment_method,public.payment_status,text) to authenticated;
grant execute on function public.consume_package_session(uuid,uuid) to authenticated;
grant execute on function public.reverse_package_session(uuid) to authenticated;
grant execute on function public.cancel_patient_package(uuid) to authenticated;
