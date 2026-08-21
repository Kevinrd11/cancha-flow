-- Varias canchas por centro deportivo.
--
-- El esquema ya era multiempresa y multi-cancha (fields.slug es único por
-- negocio y business_settings cuelga de field_id), pero no existía forma de
-- crear una segunda cancha: el onboarding creaba una sola y el panel leía
-- siempre la primera. La mayoría de centros deportivos tiene varias.
--
-- La creación va en una función porque una cancha sin su fila de
-- business_settings queda inservible: get_public_availability no devuelve
-- horarios y create_public_reservation la descarta. Las dos inserciones tienen
-- que ocurrir juntas o no ocurrir.

create or replace function public.create_business_court(
  p_business_id uuid,
  p_name text,
  p_sport text,
  p_hourly_rate numeric,
  p_reservation_minutes integer,
  p_capacity integer default 10,
  p_description text default null,
  p_location text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_court_id uuid;
  v_slug text;
  v_base text;
  v_suffix integer := 1;
  v_max_courts integer;
  v_current integer;
  v_open time;
  v_close time;
  v_hold integer;
  v_policy text;
  v_phone text;
  v_sinpe text;
  v_business_location text;
begin
  -- La comprobación de permisos vive aquí porque la función es SECURITY
  -- DEFINER: sin esto, cualquier usuario autenticado crearía canchas ajenas.
  if not public.can_configure_business(p_business_id) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  if p_reservation_minutes not in (60, 120) then
    raise exception 'La duración debe ser de 1 o 2 horas' using errcode = 'P0001';
  end if;
  if p_hourly_rate is null or p_hourly_rate <= 0 then
    raise exception 'El precio por hora debe ser mayor que cero' using errcode = 'P0001';
  end if;

  -- Límite del plan contratado. `max_courts` nulo significa sin tope.
  select p.max_courts into v_max_courts
  from public.subscriptions s join public.plans p on p.id = s.plan_id
  where s.business_id = p_business_id;

  if v_max_courts is not null then
    select count(*) into v_current from public.fields where business_id = p_business_id;
    if v_current >= v_max_courts then
      raise exception 'El plan actual permite hasta % canchas', v_max_courts using errcode = 'P0001';
    end if;
  end if;

  -- fields.location es NOT NULL: si no se indica una, la cancha hereda la
  -- dirección del centro deportivo.
  select location into v_business_location from public.businesses where id = p_business_id;

  -- Slug legible y único dentro del negocio (fields_business_slug_key).
  v_base := trim(both '-' from regexp_replace(lower(trim(p_name)), '[^a-z0-9]+', '-', 'g'));
  if v_base = '' then v_base := 'cancha'; end if;
  v_base := left(v_base, 40);
  v_slug := v_base;
  while exists (select 1 from public.fields where business_id = p_business_id and slug = v_slug) loop
    v_suffix := v_suffix + 1;
    v_slug := v_base || '-' || v_suffix;
  end loop;

  insert into public.fields (
    business_id, name, slug, sport, description, location,
    hourly_rate, reservation_minutes, capacity
  ) values (
    p_business_id, left(trim(p_name), 100), v_slug, left(trim(p_sport), 60),
    nullif(left(trim(coalesce(p_description, '')), 1200), ''),
    coalesce(nullif(left(trim(coalesce(p_location, '')), 240), ''), v_business_location),
    p_hourly_rate, p_reservation_minutes, coalesce(p_capacity, 10)
  ) returning id into v_court_id;

  -- La cancha nueva hereda el horario de la primera para que el centro no
  -- quede con agendas incoherentes; el propietario puede ajustarla después.
  select s.opening_time, s.closing_time, s.hold_minutes, s.cancellation_policy,
         s.whatsapp_phone, s.sinpe_phone
  into v_open, v_close, v_hold, v_policy, v_phone, v_sinpe
  from public.business_settings s
  join public.fields f on f.id = s.field_id
  where f.business_id = p_business_id and f.id <> v_court_id
  order by f.created_at
  limit 1;

  insert into public.business_settings (
    business_id, field_id, whatsapp_phone, sinpe_phone, opening_time, closing_time,
    minimum_reservation_minutes, hold_minutes, cancellation_policy
  ) values (
    p_business_id, v_court_id, v_phone, v_sinpe,
    coalesce(v_open, time '08:00'), coalesce(v_close, time '22:00'),
    p_reservation_minutes, coalesce(v_hold, 1440),
    coalesce(v_policy, 'Las cancelaciones y reprogramaciones están sujetas a las reglas del centro deportivo.')
  );

  return v_court_id;
end;
$$;

revoke all on function public.create_business_court(uuid,text,text,numeric,integer,integer,text,text) from public, anon;
grant execute on function public.create_business_court(uuid,text,text,numeric,integer,integer,text,text) to authenticated;
