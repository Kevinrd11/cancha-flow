-- Las nuevas cuentas de centros deportivos requieren aprobación de la plataforma.
alter table public.businesses
  add column if not exists approval_status text not null default 'approved',
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists review_note text;

alter table public.businesses drop constraint if exists businesses_approval_status_check;
alter table public.businesses
  add constraint businesses_approval_status_check
  check (approval_status in ('pending', 'approved', 'rejected'));

alter table public.businesses drop constraint if exists businesses_review_note_check;
alter table public.businesses
  add constraint businesses_review_note_check
  check (review_note is null or char_length(review_note) <= 500);

create index if not exists businesses_approval_status_idx
  on public.businesses (approval_status, created_at desc);

-- Los registros existentes ya tenían acceso, por lo que se conservan aprobados.
update public.businesses
set approval_status = 'approved', reviewed_at = coalesce(reviewed_at, created_at);

-- El onboarding crea toda la configuración, pero la mantiene privada e inactiva
-- hasta que un platform_admin la revise.
create or replace function public.complete_business_onboarding(
  p_user_id uuid,
  p_owner_name text,
  p_business_name text,
  p_slug text,
  p_phone text,
  p_location text,
  p_description text,
  p_currency text,
  p_timezone text,
  p_court_name text,
  p_sport text,
  p_opening_time time,
  p_closing_time time,
  p_reservation_minutes integer,
  p_hourly_rate numeric,
  p_plan_code text,
  p_billing_interval public.billing_interval
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid;
  v_court_id uuid;
  v_plan_id uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  select id into v_plan_id
  from public.plans
  where code = p_plan_code and active = true;
  if v_plan_id is null then raise exception 'Plan inválido'; end if;

  insert into public.profiles (id, full_name, role, active)
  values (p_user_id, left(trim(p_owner_name), 100), 'owner', false)
  on conflict (id) do update
  set full_name = excluded.full_name, role = 'owner', active = false;

  insert into public.businesses (
    name, slug, description, phone, whatsapp_phone, email, location, currency,
    timezone, subscription_status, active, approval_status
  ) values (
    left(trim(p_business_name), 100), p_slug, left(trim(p_description), 1200),
    p_phone, p_phone, (select email from auth.users where id = p_user_id),
    left(trim(p_location), 240), upper(p_currency)::char(3), p_timezone,
    'trial', false, 'pending'
  ) returning id into v_business_id;

  insert into public.business_members (business_id, user_id, role, active)
  values (v_business_id, p_user_id, 'owner', false);

  insert into public.fields (
    business_id, name, slug, sport, description, location, hourly_rate,
    reservation_minutes, capacity
  ) values (
    v_business_id, left(trim(p_court_name), 100), 'principal',
    left(trim(p_sport), 60), 'Primera cancha de ' || left(trim(p_business_name), 100),
    left(trim(p_location), 240), p_hourly_rate, p_reservation_minutes, 10
  ) returning id into v_court_id;

  insert into public.business_settings (
    business_id, field_id, whatsapp_phone, sinpe_phone, opening_time,
    closing_time, minimum_reservation_minutes, hold_minutes, cancellation_policy
  ) values (
    v_business_id, v_court_id, p_phone, p_phone, p_opening_time, p_closing_time,
    p_reservation_minutes, 20,
    'Las cancelaciones y reprogramaciones están sujetas a las reglas del centro deportivo.'
  );

  insert into public.subscriptions (
    business_id, plan_id, status, billing_interval, trial_ends_at
  ) values (
    v_business_id, v_plan_id, 'trial', p_billing_interval, now() + interval '14 days'
  );

  return v_business_id;
end;
$$;

revoke all on function public.complete_business_onboarding(
  uuid,text,text,text,text,text,text,text,text,text,text,time,time,integer,numeric,text,public.billing_interval
) from public, anon, authenticated;
grant execute on function public.complete_business_onboarding(
  uuid,text,text,text,text,text,text,text,text,text,text,time,time,integer,numeric,text,public.billing_interval
) to service_role;

-- Revisa una solicitud de forma atómica. El cliente solo envía el id y la
-- decisión; la identidad del revisor siempre proviene de auth.uid().
create or replace function public.review_business_application(
  p_business_id uuid,
  p_decision text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid;
  v_approved boolean;
begin
  if not public.is_platform_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if p_decision not in ('approved', 'rejected') then
    raise exception 'Decisión inválida' using errcode = '22023';
  end if;
  if p_note is not null and char_length(trim(p_note)) > 500 then
    raise exception 'Nota demasiado larga' using errcode = '22023';
  end if;

  select user_id into v_owner_id
  from public.business_members
  where business_id = p_business_id and role = 'owner'
  order by created_at
  limit 1
  for update;

  if v_owner_id is null then
    raise exception 'Solicitud no encontrada' using errcode = 'P0002';
  end if;

  v_approved := p_decision = 'approved';

  update public.businesses
  set approval_status = p_decision,
      active = v_approved,
      subscription_status = case when v_approved then 'trial'::public.subscription_status else 'suspended'::public.subscription_status end,
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      review_note = nullif(trim(p_note), '')
  where id = p_business_id;

  update public.profiles set active = v_approved where id = v_owner_id;
  update public.business_members
  set active = v_approved
  where business_id = p_business_id and user_id = v_owner_id and role = 'owner';
  update public.subscriptions
  set status = case when v_approved then 'trial'::public.subscription_status else 'suspended'::public.subscription_status end,
      trial_ends_at = case when v_approved then now() + interval '14 days' else trial_ends_at end
  where business_id = p_business_id;

  insert into public.security_audit_events (
    actor_id, business_id, action, outcome, target_id, metadata
  ) values (
    auth.uid(), p_business_id, 'platform.application_' || p_decision,
    'success', v_owner_id, jsonb_build_object('note_provided', p_note is not null)
  );
end;
$$;

revoke all on function public.review_business_application(uuid,text,text) from public, anon;
grant execute on function public.review_business_application(uuid,text,text) to authenticated, service_role;

-- Una solicitud pendiente tampoco debe aparecer por acceso anónimo directo a REST.
drop policy if exists "businesses_public_or_member_read" on public.businesses;
create policy "businesses_public_or_member_read" on public.businesses
for select to anon, authenticated
using (
  (active = true and approval_status = 'approved')
  or public.can_access_business(id)
);

drop policy if exists "fields_public_read_active" on public.fields;
create policy "fields_public_read_active" on public.fields
for select to anon, authenticated
using (
  (
    active = true
    and exists (
      select 1 from public.businesses b
      where b.id = fields.business_id and b.active = true and b.approval_status = 'approved'
    )
  )
  or public.can_access_business(business_id)
);
