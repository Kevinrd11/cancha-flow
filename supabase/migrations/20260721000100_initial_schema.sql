-- Esquema inicial para Supabase/PostgreSQL. Debe ejecutarse antes de las evoluciones multiempresa.
create extension if not exists pgcrypto;
create extension if not exists btree_gist;

create type public.app_role as enum ('admin');
create type public.reservation_status as enum (
  'pending', 'awaiting_payment', 'awaiting_approval', 'confirmed',
  'cancelled', 'completed', 'no_show', 'expired'
);
create type public.payment_status as enum ('unpaid', 'pending', 'approved', 'rejected', 'refunded');
create type public.reservation_source as enum ('website', 'whatsapp', 'phone', 'walk_in', 'admin');
create type public.payment_method as enum ('sinpe', 'cash', 'transfer', 'other');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 100),
  role public.app_role not null default 'admin',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.fields (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 100),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  description text,
  location text not null,
  hourly_rate numeric(12,2) not null check (hourly_rate > 0),
  capacity smallint check (capacity > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 3 and 100),
  phone text not null unique check (char_length(phone) between 8 and 20),
  email text check (email is null or char_length(email) <= 254),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  reservation_code text not null unique check (reservation_code ~ '^LD-[A-Z0-9]{6,12}$'),
  public_token uuid not null default gen_random_uuid(),
  field_id uuid not null references public.fields(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  reservation_date date not null,
  start_time time not null,
  end_time time not null,
  status public.reservation_status not null default 'awaiting_payment',
  payment_status public.payment_status not null default 'unpaid',
  subtotal numeric(12,2) not null check (subtotal >= 0),
  total numeric(12,2) not null check (total >= 0),
  source public.reservation_source not null default 'website',
  notes text check (notes is null or char_length(notes) <= 2000),
  expires_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reservation_time_order check (end_time > start_time)
);

-- Esta restricción es la última barrera contra carreras concurrentes. Los rangos son [inicio, fin),
-- por lo que una reserva que termina a las 19:00 no choca con otra que inicia a las 19:00.
alter table public.reservations
  add constraint reservations_no_active_overlap
  exclude using gist (
    field_id with =,
    tsrange(reservation_date + start_time, reservation_date + end_time, '[)') with &&
  ) where (status in ('pending', 'awaiting_payment', 'awaiting_approval', 'confirmed'));

create index reservations_date_idx on public.reservations (reservation_date, start_time);
create index reservations_status_idx on public.reservations (status, payment_status);
create index reservations_customer_idx on public.reservations (customer_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 0),
  method public.payment_method not null default 'sinpe',
  status public.payment_status not null default 'pending',
  proof_path text,
  original_file_name text,
  mime_type text,
  file_size integer check (file_size is null or file_size between 1 and 5242880),
  rejection_reason text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index payments_reservation_idx on public.payments (reservation_id);

create table public.blocked_slots (
  id uuid primary key default gen_random_uuid(),
  field_id uuid not null references public.fields(id) on delete cascade,
  blocked_date date not null,
  start_time time not null,
  end_time time not null,
  reason text not null check (char_length(reason) between 2 and 300),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint blocked_time_order check (end_time > start_time)
);

alter table public.blocked_slots
  add constraint blocked_slots_no_overlap
  exclude using gist (
    field_id with =,
    tsrange(blocked_date + start_time, blocked_date + end_time, '[)') with &&
  );

create index blocked_slots_date_idx on public.blocked_slots (blocked_date, start_time);

create table public.business_settings (
  id uuid primary key default gen_random_uuid(),
  field_id uuid not null unique references public.fields(id) on delete cascade,
  whatsapp_phone text not null,
  sinpe_phone text not null,
  opening_time time not null default '08:00',
  closing_time time not null default '23:00',
  minimum_reservation_minutes integer not null default 60 check (minimum_reservation_minutes between 30 and 240),
  slot_interval_minutes integer not null default 30 check (slot_interval_minutes in (15, 30, 60)),
  hold_minutes integer not null default 20 check (hold_minutes between 5 and 180),
  cancellation_policy text not null,
  non_working_days jsonb not null default '[]'::jsonb check (jsonb_typeof(non_working_days) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_hours_order check (closing_time > opening_time)
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  table_name text not null,
  record_id uuid,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_record_idx on public.audit_logs (table_name, record_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger fields_updated_at before update on public.fields for each row execute function public.set_updated_at();
create trigger customers_updated_at before update on public.customers for each row execute function public.set_updated_at();
create trigger reservations_updated_at before update on public.reservations for each row execute function public.set_updated_at();
create trigger payments_updated_at before update on public.payments for each row execute function public.set_updated_at();
create trigger blocked_slots_updated_at before update on public.blocked_slots for each row execute function public.set_updated_at();
create trigger business_settings_updated_at before update on public.business_settings for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Los administradores se crean deliberadamente desde el panel de Supabase.
  -- No se asigna perfil automáticamente para evitar elevar a cualquier usuario nuevo.
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and active = true
  );
$$;

create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_id uuid;
begin
  if TG_OP = 'DELETE' then target_id := old.id; else target_id := new.id; end if;
  insert into public.audit_logs (actor_id, table_name, record_id, action, old_data, new_data)
  values (
    auth.uid(), TG_TABLE_NAME, target_id, TG_OP,
    case when TG_OP in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when TG_OP in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );
  if TG_OP = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger reservations_audit after insert or update or delete on public.reservations for each row execute function public.write_audit_log();
create trigger payments_audit after insert or update or delete on public.payments for each row execute function public.write_audit_log();
create trigger blocked_slots_audit after insert or update or delete on public.blocked_slots for each row execute function public.write_audit_log();
create trigger settings_audit after insert or update or delete on public.business_settings for each row execute function public.write_audit_log();

create or replace function public.expire_stale_reservations()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed integer;
begin
  update public.reservations
  set status = 'expired', updated_at = now()
  where status in ('pending', 'awaiting_payment')
    and expires_at is not null
    and expires_at < now();
  get diagnostics changed = row_count;
  return changed;
end;
$$;

create or replace function public.create_public_reservation(
  p_field_id uuid,
  p_reservation_date date,
  p_start_time time,
  p_end_time time,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text default null
)
returns table (reservation_code text, public_token uuid, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid;
  v_rate numeric(12,2);
  v_hold integer;
  v_total numeric(12,2);
  v_code text;
  v_token uuid;
  v_expires timestamptz;
begin
  if p_reservation_date < (now() at time zone 'America/Costa_Rica')::date then
    raise exception 'No se permiten fechas pasadas' using errcode = 'P0001';
  end if;
  if p_reservation_date = (now() at time zone 'America/Costa_Rica')::date
     and p_start_time <= (now() at time zone 'America/Costa_Rica')::time then
    raise exception 'No se permiten horarios pasados' using errcode = 'P0001';
  end if;
  if p_end_time <= p_start_time then
    raise exception 'El horario no es válido' using errcode = 'P0001';
  end if;

  -- Serializa las escrituras del mismo campo y día, incluyendo bloqueos administrativos.
  perform pg_advisory_xact_lock(hashtextextended(p_field_id::text || p_reservation_date::text, 0));
  perform public.expire_stale_reservations();

  select f.hourly_rate, s.hold_minutes
    into v_rate, v_hold
  from public.fields f
  join public.business_settings s on s.field_id = f.id
  where f.id = p_field_id and f.active = true;

  if v_rate is null then
    raise exception 'Cancha no disponible' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.blocked_slots b
    where b.field_id = p_field_id and b.blocked_date = p_reservation_date
      and tsrange(p_reservation_date + b.start_time, p_reservation_date + b.end_time, '[)')
          && tsrange(p_reservation_date + p_start_time, p_reservation_date + p_end_time, '[)')
  ) then
    raise exception 'Horario bloqueado' using errcode = 'P0001';
  end if;

  insert into public.customers (full_name, phone, email)
  values (left(trim(p_customer_name), 100), left(trim(p_customer_phone), 20), nullif(lower(trim(p_customer_email)), ''))
  on conflict (phone) do update
    set full_name = excluded.full_name,
        email = coalesce(excluded.email, public.customers.email),
        updated_at = now()
  returning id into v_customer_id;

  v_total := round(v_rate * (extract(epoch from (p_end_time - p_start_time)) / 3600), 2);
  v_code := 'LD-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  v_token := gen_random_uuid();
  v_expires := now() + make_interval(mins => v_hold);

  insert into public.reservations (
    reservation_code, public_token, field_id, customer_id, reservation_date,
    start_time, end_time, status, payment_status, subtotal, total, source, expires_at
  ) values (
    v_code, v_token, p_field_id, v_customer_id, p_reservation_date,
    p_start_time, p_end_time, 'awaiting_payment', 'unpaid', v_total, v_total, 'website', v_expires
  );

  return query select v_code, v_token, v_expires;
end;
$$;

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
  select opening_time, closing_time, slot_interval_minutes,
    non_working_days ? p_date::text
  into v_open, v_close, v_interval, v_closed
  from public.business_settings where field_id = p_field_id;

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

create or replace function public.create_admin_reservation(
  p_field_id uuid,
  p_reservation_date date,
  p_start_time time,
  p_end_time time,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_source public.reservation_source,
  p_status public.reservation_status,
  p_notes text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid;
  v_rate numeric(12,2);
  v_total numeric(12,2);
  v_code text;
begin
  if not public.is_admin() then raise exception 'No autorizado' using errcode = '42501'; end if;
  if p_end_time <= p_start_time then raise exception 'Horario inválido' using errcode = 'P0001'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_field_id::text || p_reservation_date::text, 0));

  if exists (
    select 1 from public.blocked_slots b where b.field_id = p_field_id and b.blocked_date = p_reservation_date
      and tsrange(p_reservation_date + b.start_time, p_reservation_date + b.end_time, '[)')
          && tsrange(p_reservation_date + p_start_time, p_reservation_date + p_end_time, '[)')
  ) then raise exception 'Horario bloqueado' using errcode = 'P0001'; end if;

  select hourly_rate into v_rate from public.fields where id = p_field_id and active = true;
  if v_rate is null then raise exception 'Cancha no disponible' using errcode = 'P0001'; end if;

  insert into public.customers (full_name, phone, email)
  values (left(trim(p_customer_name), 100), left(trim(p_customer_phone), 20), nullif(lower(trim(p_customer_email)), ''))
  on conflict (phone) do update set full_name = excluded.full_name, email = coalesce(excluded.email, public.customers.email), updated_at = now()
  returning id into v_customer_id;

  v_total := round(v_rate * (extract(epoch from (p_end_time - p_start_time)) / 3600), 2);
  v_code := 'LD-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into public.reservations (
    reservation_code, field_id, customer_id, reservation_date, start_time, end_time,
    status, payment_status, subtotal, total, source, notes, created_by
  ) values (
    v_code, p_field_id, v_customer_id, p_reservation_date, p_start_time, p_end_time,
    p_status, case when p_status = 'confirmed' then 'approved' else 'unpaid' end,
    v_total, v_total, p_source, nullif(trim(p_notes), ''), auth.uid()
  );
  return v_code;
end;
$$;

create or replace function public.create_blocked_slot(
  p_field_id uuid,
  p_date date,
  p_start_time time,
  p_end_time time,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not public.is_admin() then raise exception 'No autorizado' using errcode = '42501'; end if;
  if p_end_time <= p_start_time then raise exception 'Horario inválido' using errcode = 'P0001'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_field_id::text || p_date::text, 0));
  if exists (
    select 1 from public.reservations r
    where r.field_id = p_field_id and r.reservation_date = p_date
      and r.status in ('pending', 'awaiting_payment', 'awaiting_approval', 'confirmed')
      and tsrange(p_date + r.start_time, p_date + r.end_time, '[)')
          && tsrange(p_date + p_start_time, p_date + p_end_time, '[)')
  ) then raise exception 'El periodo contiene una reserva activa' using errcode = 'P0001'; end if;
  insert into public.blocked_slots (field_id, blocked_date, start_time, end_time, reason, created_by)
  values (p_field_id, p_date, p_start_time, p_end_time, left(trim(p_reason), 300), auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.update_admin_reservation_schedule(
  p_reservation_id uuid,
  p_date date,
  p_start_time time,
  p_end_time time,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_field_id uuid;
begin
  if not public.is_admin() then raise exception 'No autorizado' using errcode = '42501'; end if;
  if p_end_time <= p_start_time then raise exception 'Horario inválido' using errcode = 'P0001'; end if;
  select field_id into v_field_id from public.reservations where id = p_reservation_id for update;
  if v_field_id is null then raise exception 'Reserva inexistente' using errcode = 'P0001'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_field_id::text || p_date::text, 0));
  if exists (
    select 1 from public.blocked_slots b
    where b.field_id = v_field_id and b.blocked_date = p_date
      and tsrange(p_date + b.start_time, p_date + b.end_time, '[)')
          && tsrange(p_date + p_start_time, p_date + p_end_time, '[)')
  ) then raise exception 'Horario bloqueado' using errcode = 'P0001'; end if;
  update public.reservations
  set reservation_date = p_date, start_time = p_start_time, end_time = p_end_time,
      notes = case when p_notes is null then notes else nullif(left(trim(p_notes), 2000), '') end
  where id = p_reservation_id;
end;
$$;

create or replace function public.review_reservation_payment(
  p_reservation_id uuid,
  p_payment_status public.payment_status,
  p_reservation_status public.reservation_status default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'No autorizado' using errcode = '42501'; end if;
  update public.payments
  set status = p_payment_status, reviewed_by = auth.uid(), reviewed_at = now()
  where id = (
    select id from public.payments where reservation_id = p_reservation_id
    order by created_at desc limit 1
  );
  update public.reservations
  set payment_status = p_payment_status,
      status = coalesce(p_reservation_status, status),
      expires_at = case when p_payment_status = 'approved' then null else expires_at end
  where id = p_reservation_id;
end;
$$;

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.fields enable row level security;
alter table public.customers enable row level security;
alter table public.reservations enable row level security;
alter table public.payments enable row level security;
alter table public.blocked_slots enable row level security;
alter table public.business_settings enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles_read_own_or_admin" on public.profiles for select
  to authenticated using (id = auth.uid() or public.is_admin());
create policy "profiles_admin_all" on public.profiles for all
  to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "fields_public_read_active" on public.fields for select
  to anon, authenticated using (active = true or public.is_admin());
create policy "fields_admin_write" on public.fields for all
  to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "customers_admin_all" on public.customers for all
  to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "reservations_admin_all" on public.reservations for all
  to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "payments_admin_all" on public.payments for all
  to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "blocked_slots_admin_all" on public.blocked_slots for all
  to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "settings_public_read" on public.business_settings for select
  to anon, authenticated using (true);
create policy "settings_admin_write" on public.business_settings for all
  to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "audit_admin_read" on public.audit_logs for select
  to authenticated using (public.is_admin());

revoke all on function public.expire_stale_reservations() from public, anon, authenticated;
grant execute on function public.get_public_availability(uuid, date) to anon, authenticated;
grant execute on function public.create_public_reservation(uuid, date, time, time, text, text, text) to anon, authenticated;
grant execute on function public.create_admin_reservation(uuid, date, time, time, text, text, text, public.reservation_source, public.reservation_status, text) to authenticated;
grant execute on function public.create_blocked_slot(uuid, date, time, time, text) to authenticated;
grant execute on function public.update_admin_reservation_schedule(uuid, date, time, time, text) to authenticated;
grant execute on function public.review_reservation_payment(uuid, public.payment_status, public.reservation_status) to authenticated;

-- Bucket privado. Los comprobantes se sirven únicamente mediante URL firmada a administradores.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-proofs', 'payment-proofs', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "payment_proofs_admin_read" on storage.objects for select
  to authenticated using (bucket_id = 'payment-proofs' and public.is_admin());
create policy "payment_proofs_admin_delete" on storage.objects for delete
  to authenticated using (bucket_id = 'payment-proofs' and public.is_admin());

-- Ejecutar cada 5 minutos con Supabase Cron (pg_cron):
-- select cron.schedule('expire-reservation-holds', '*/5 * * * *', 'select public.expire_stale_reservations()');
