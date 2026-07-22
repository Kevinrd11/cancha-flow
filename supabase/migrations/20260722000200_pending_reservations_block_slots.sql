-- Las solicitudes públicas quedan pendientes hasta que el propietario las confirme o cancele.
-- Mientras estén pendientes, la exclusión reservations_no_active_overlap evita dobles reservas.
update public.reservations
set status = 'pending', expires_at = null, updated_at = now()
where source = 'website'
  and status in ('pending', 'awaiting_payment', 'awaiting_approval');

create or replace function public.create_public_reservation(
  p_field_id uuid, p_reservation_date date, p_start_time time, p_end_time time,
  p_customer_name text, p_customer_phone text, p_customer_email text default null
)
returns table(reservation_code text, public_token uuid, expires_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare
  v_customer_id uuid; v_business_id uuid; v_rate numeric(12,2);
  v_total numeric(12,2); v_code text; v_token uuid;
begin
  if p_reservation_date < (now() at time zone 'America/Costa_Rica')::date
     or (p_reservation_date = (now() at time zone 'America/Costa_Rica')::date and p_start_time <= (now() at time zone 'America/Costa_Rica')::time)
     or p_end_time <= p_start_time then raise exception 'Horario no válido' using errcode = 'P0001'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_field_id::text || p_reservation_date::text, 0));
  perform public.expire_stale_reservations();

  select f.business_id, f.hourly_rate into v_business_id, v_rate
  from public.fields f
  join public.businesses b on b.id = f.business_id
  join public.business_settings s on s.field_id = f.id
  where f.id = p_field_id and f.active and b.active
    and b.subscription_status not in ('canceled', 'suspended');

  if v_business_id is null then
    raise exception 'Cancha no disponible' using errcode = 'P0001';
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

  insert into public.reservations (
    business_id, reservation_code, public_token, public_token_hash, field_id,
    customer_id, reservation_date, start_time, end_time, status, payment_status,
    subtotal, total, source, expires_at
  ) values (
    v_business_id, v_code, null,
    encode(extensions.digest(v_token::text, 'sha256'), 'hex'),
    p_field_id, v_customer_id, p_reservation_date, p_start_time, p_end_time,
    'pending', 'unpaid', v_total, v_total, 'website', null
  );

  return query select v_code, v_token, null::timestamptz;
end;
$$;

revoke all on function public.create_public_reservation(uuid,date,time,time,text,text,text) from public;
grant execute on function public.create_public_reservation(uuid,date,time,time,text,text,text) to anon, authenticated;
