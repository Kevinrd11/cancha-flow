-- Endurecimiento de la reserva pública.
--
-- Tres problemas que solo se ven en operación real:
--
-- 1. Una solicitud web nacía `pending` con `expires_at = null`, y la constraint
--    de exclusión cuenta `pending` como estado activo. Resultado: una solicitud
--    abandonada bloqueaba ese horario para siempre y `hold_minutes` no hacía
--    nada. Se restituye la expiración, pero con una ventana pensada para que el
--    propietario responda (horas, no minutos): un hold de 20 minutos cancelaba
--    solicitudes legítimas hechas de noche, que es justo lo que la migración
--    20260722000200 quiso evitar.
-- 2. `create_public_reservation` no comprobaba el horario comercial ni los días
--    no laborables, y la función está concedida a `anon`: se podía crear una
--    reserva a las 03:00 de un domingo cerrado, o en 2030, llamando al RPC
--    directamente sin pasar por la aplicación.
-- 3. `get_public_availability` publicaba horarios de centros inactivos o
--    todavía no aprobados.

-- El rate limiting de la reserva pública necesita su propia acción.
create or replace function public.consume_auth_rate_limit(
  p_action text,
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.auth_rate_limits%rowtype;
  v_now timestamptz := clock_timestamp();
begin
  if auth.role() <> 'service_role' then raise exception 'No autorizado' using errcode = '42501'; end if;
  if p_action not in ('login', 'register', 'recovery', 'reservation')
     or p_key_hash !~ '^[a-f0-9]{64}$'
     or p_limit not between 1 and 100
     or p_window_seconds not between 1 and 86400 then
    raise exception 'Parámetros de rate limit inválidos' using errcode = '22023';
  end if;

  insert into public.auth_rate_limits (action, key_hash, window_started_at, attempt_count)
  values (p_action, p_key_hash, v_now, 0)
  on conflict (action, key_hash) do nothing;

  select * into v_row
  from public.auth_rate_limits
  where action = p_action and key_hash = p_key_hash
  for update;

  if v_row.window_started_at + make_interval(secs => p_window_seconds) <= v_now then
    update public.auth_rate_limits
    set window_started_at = v_now, attempt_count = 1
    where action = p_action and key_hash = p_key_hash
    returning * into v_row;
  else
    update public.auth_rate_limits
    set attempt_count = attempt_count + 1
    where action = p_action and key_hash = p_key_hash
    returning * into v_row;
  end if;

  allowed := v_row.attempt_count <= p_limit;
  retry_after_seconds := greatest(0, ceil(extract(epoch from (v_row.window_started_at + make_interval(secs => p_window_seconds) - v_now)))::integer);
  if random() < 0.01 then
    delete from public.auth_rate_limits where window_started_at < v_now - interval '2 days';
  end if;
  return next;
end;
$$;

revoke all on function public.consume_auth_rate_limit(text,text,integer,integer) from public, anon, authenticated;
grant execute on function public.consume_auth_rate_limit(text,text,integer,integer) to service_role;

-- `hold_minutes` pasa a significar "tiempo máximo para responder una solicitud".
-- El rango anterior (5–180 min) era demasiado corto para eso.
alter table public.business_settings
  drop constraint if exists business_settings_hold_minutes_check;

-- Los centros que quedaron con el hold de 20 minutos del onboarding anterior
-- pasan a 24 horas. Va antes de la constraint: con filas por debajo del nuevo
-- mínimo, ALTER TABLE ... ADD CONSTRAINT falla y aborta la migración entera.
update public.business_settings
set hold_minutes = 1440, updated_at = now()
where hold_minutes < 60;

alter table public.business_settings
  add constraint business_settings_hold_minutes_check
  check (hold_minutes between 60 and 4320);

alter table public.business_settings
  alter column hold_minutes set default 1440;

-- El onboarding fijaba hold_minutes = 20, que ya no cumple la constraint
-- nueva: sin esto, cada registro de centro fallaría. Se recrea la función
-- idéntica salvo ese valor.
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
    p_reservation_minutes, 1440,
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

-- Las solicitudes que hoy están congeladas sin fecha de vencimiento reciben una.
update public.reservations r
set expires_at = r.created_at + make_interval(mins => s.hold_minutes), updated_at = now()
from public.business_settings s
where s.field_id = r.field_id
  and r.source = 'website'
  and r.status = 'pending'
  and r.expires_at is null;

create or replace function public.create_public_reservation(
  p_field_id uuid, p_reservation_date date, p_start_time time, p_end_time time,
  p_customer_name text, p_customer_phone text, p_customer_email text default null
)
returns table(reservation_code text, public_token uuid, expires_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare
  v_customer_id uuid; v_business_id uuid; v_rate numeric(12,2); v_hold integer;
  v_open time; v_close time; v_closed boolean;
  v_total numeric(12,2); v_code text; v_token uuid; v_expires timestamptz;
  v_today date := (now() at time zone 'America/Costa_Rica')::date;
begin
  if p_reservation_date < v_today
     or (p_reservation_date = v_today and p_start_time <= (now() at time zone 'America/Costa_Rica')::time)
     or p_end_time <= p_start_time then raise exception 'Horario no válido' using errcode = 'P0001'; end if;

  -- Sin esta cota, un POST directo podía apartar una cancha con años de
  -- anticipación y dejarla bloqueada.
  if p_reservation_date > v_today + 60 then
    raise exception 'La fecha está demasiado lejos' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_field_id::text || p_reservation_date::text, 0));
  perform public.expire_stale_reservations();

  select f.business_id, f.hourly_rate, s.hold_minutes, s.opening_time, s.closing_time,
         s.non_working_days ? p_reservation_date::text
  into v_business_id, v_rate, v_hold, v_open, v_close, v_closed
  from public.fields f
  join public.businesses b on b.id = f.business_id
  join public.business_settings s on s.field_id = f.id
  where f.id = p_field_id and f.active and b.active
    and b.approval_status = 'approved'
    and b.subscription_status not in ('canceled', 'suspended');

  if v_business_id is null then
    raise exception 'Cancha no disponible' using errcode = 'P0001';
  end if;

  -- La interfaz ya solo ofrece horas abiertas, pero el RPC está concedido a
  -- `anon` y es la única barrera para quien lo llame directamente.
  if v_closed then
    raise exception 'La cancha no abre ese día' using errcode = 'P0001';
  end if;
  if p_start_time < v_open or p_end_time > v_close then
    raise exception 'Horario fuera del horario de atención' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.blocked_slots
    where field_id = p_field_id and blocked_date = p_reservation_date
      and tsrange(p_reservation_date + start_time, p_reservation_date + end_time, '[)')
          && tsrange(p_reservation_date + p_start_time, p_reservation_date + p_end_time, '[)')
  ) then
    raise exception 'Horario bloqueado' using errcode = 'P0001';
  end if;

  insert into public.customers (business_id, full_name, phone, email)
  values (
    v_business_id,
    left(trim(p_customer_name), 100),
    left(trim(p_customer_phone), 20),
    nullif(lower(trim(p_customer_email)), '')
  )
  on conflict (business_id, phone) do update
  set full_name = excluded.full_name,
      email = coalesce(excluded.email, public.customers.email),
      updated_at = now()
  returning id into v_customer_id;

  v_total := round(v_rate * (extract(epoch from (p_end_time - p_start_time)) / 3600), 2);
  v_code := 'CF-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  v_token := gen_random_uuid();
  v_expires := now() + make_interval(mins => v_hold);

  insert into public.reservations (
    business_id, reservation_code, public_token, public_token_hash, field_id,
    customer_id, reservation_date, start_time, end_time, status, payment_status,
    subtotal, total, source, expires_at
  ) values (
    v_business_id, v_code, null,
    encode(extensions.digest(v_token::text, 'sha256'), 'hex'),
    p_field_id, v_customer_id, p_reservation_date, p_start_time, p_end_time,
    'pending', 'unpaid', v_total, v_total, 'website', v_expires
  );

  return query select v_code, v_token, v_expires;
end;
$$;

revoke all on function public.create_public_reservation(uuid,date,time,time,text,text,text) from public;
grant execute on function public.create_public_reservation(uuid,date,time,time,text,text,text) to anon, authenticated;

-- La disponibilidad pública no debe exponer centros inactivos o sin aprobar.
create or replace function public.get_public_availability(p_field_id uuid, p_date date)
returns table (slot_time time, slot_state text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_open time;
  v_close time;
  v_interval integer;
  v_closed boolean;
begin
  perform public.expire_stale_reservations();
  select s.opening_time, s.closing_time, s.slot_interval_minutes,
    s.non_working_days ? p_date::text
  into v_open, v_close, v_interval, v_closed
  from public.business_settings s
  join public.fields f on f.id = s.field_id
  join public.businesses b on b.id = f.business_id
  where s.field_id = p_field_id
    and f.active and b.active
    and b.approval_status = 'approved'
    and b.subscription_status not in ('canceled', 'suspended');

  if v_open is null then return; end if;

  return query
  with slots as (
    select value::time as starts_at,
           (value + make_interval(mins => v_interval))::time as ends_at
    from generate_series(
      p_date + v_open,
      p_date + v_close - make_interval(mins => v_interval),
      make_interval(mins => v_interval)
    ) value
  )
  select s.starts_at,
    case
      when v_closed then 'blocked'
      when exists (
        select 1 from public.blocked_slots b
        where b.field_id = p_field_id and b.blocked_date = p_date
          and tsrange(p_date + b.start_time, p_date + b.end_time, '[)')
              && tsrange(p_date + s.starts_at, p_date + s.ends_at, '[)')
      ) then 'blocked'
      when exists (
        select 1 from public.reservations r
        where r.field_id = p_field_id and r.reservation_date = p_date and r.status = 'confirmed'
          and tsrange(p_date + r.start_time, p_date + r.end_time, '[)')
              && tsrange(p_date + s.starts_at, p_date + s.ends_at, '[)')
      ) then 'reserved'
      when exists (
        select 1 from public.reservations r
        where r.field_id = p_field_id and r.reservation_date = p_date
          and r.status in ('pending', 'awaiting_payment', 'awaiting_approval')
          and tsrange(p_date + r.start_time, p_date + r.end_time, '[)')
              && tsrange(p_date + s.starts_at, p_date + s.ends_at, '[)')
      ) then 'pending'
      else 'available'
    end::text
  from slots s order by s.starts_at;
end;
$$;

grant execute on function public.get_public_availability(uuid, date) to anon, authenticated;

-- Las reservas vencidas también se liberan sin tráfico: los RPC ya llaman a
-- expire_stale_reservations(), pero una cancha sin visitas nunca se limpiaría.
-- pg_cron no está habilitado en todos los proyectos, así que no se bloquea la
-- migración si falta.
do $$
begin
  perform cron.schedule(
    'expire-reservation-holds',
    '*/5 * * * *',
    'select public.expire_stale_reservations()'
  );
-- Se capturan todas: según cómo falte pg_cron, Postgres levanta
-- invalid_schema_name, undefined_function o insufficient_privilege, y
-- programar el trabajo es opcional.
exception when others then
  raise notice 'pg_cron no disponible: habilite la extensión y programe expire_stale_reservations() manualmente.';
end;
$$;
