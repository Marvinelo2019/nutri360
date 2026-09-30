-- A completed payment cannot be dated in the future of its clinic.

create function private.validate_payment_date()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  organization_timezone text;
begin
  select timezone into organization_timezone
  from public.organizations where id = new.organization_id;
  if new.status = 'paid'
    and (new.paid_at at time zone organization_timezone)::date
      > (now() at time zone organization_timezone)::date then
    raise exception 'Paid date cannot be in the future';
  end if;
  return new;
end;
$$;

create trigger payments_validate_date
  before insert or update on public.payments
  for each row execute procedure private.validate_payment_date();
