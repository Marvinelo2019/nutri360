-- Report payments in the month they became paid, or their creation month while pending.

create or replace function public.list_payments_for_local_month(
  target_organization_id uuid,
  target_month date
)
returns setof public.payments
language sql
security definer
set search_path = ''
stable
as $$
  select payment.*
  from public.payments as payment
  join public.organizations as organization on organization.id = payment.organization_id
  where payment.organization_id = target_organization_id
    and (select private.has_organization_role(
      target_organization_id,
      array['owner','nutritionist','assistant']::public.app_role[]
    ))
    and coalesce(payment.paid_at, payment.created_at)
      >= date_trunc('month', target_month::timestamp) at time zone organization.timezone
    and coalesce(payment.paid_at, payment.created_at)
      < (date_trunc('month', target_month::timestamp) + interval '1 month') at time zone organization.timezone
  order by coalesce(payment.paid_at, payment.created_at) desc;
$$;
