-- Endurecimiento de autenticación, autorización y aislamiento multiempresa.

-- Todo usuario público nace como cliente. La elevación a owner/staff se realiza
-- únicamente mediante flujos de servidor que usan service_role.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  v_name := left(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 100);
  if char_length(v_name) < 2 then v_name := 'Usuario'; end if;
  insert into public.profiles (id, full_name, role, active)
  values (new.id, v_name, 'customer', true)
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

-- Rate limiting distribuido y atómico. Solo las rutas con service_role pueden consumirlo.
create table if not exists public.auth_rate_limits (
  action text not null,
  key_hash text not null check (key_hash ~ '^[a-f0-9]{64}$'),
  window_started_at timestamptz not null default now(),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  primary key (action, key_hash)
);
create index if not exists auth_rate_limits_window_idx on public.auth_rate_limits (window_started_at);

alter table public.auth_rate_limits enable row level security;
revoke all on table public.auth_rate_limits from public, anon, authenticated;
grant all on table public.auth_rate_limits to service_role;

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
  if p_action not in ('login', 'register', 'recovery')
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

-- Auditoría de seguridad sin correos, IP, credenciales, cookies ni tokens.
create table if not exists public.security_audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  business_id uuid references public.businesses(id) on delete set null,
  action text not null check (char_length(action) between 3 and 80),
  outcome text not null check (outcome in ('success', 'failure', 'blocked')),
  target_id uuid,
  request_fingerprint text check (request_fingerprint is null or request_fingerprint ~ '^[a-f0-9]{64}$'),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);
create index if not exists security_audit_actor_idx on public.security_audit_events (actor_id, created_at desc);
create index if not exists security_audit_business_idx on public.security_audit_events (business_id, created_at desc);
alter table public.security_audit_events enable row level security;
revoke all on table public.security_audit_events from public, anon, authenticated;
grant select on table public.security_audit_events to authenticated;
grant all on table public.security_audit_events to service_role;
grant usage, select on sequence public.security_audit_events_id_seq to service_role;

create or replace function public.can_configure_business(p_business_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_platform_admin() or exists (
    select 1 from public.business_members
    where user_id = auth.uid() and business_id = p_business_id and active = true and role = 'owner'
  );
$$;
revoke all on function public.can_configure_business(uuid) from public, anon;
grant execute on function public.can_configure_business(uuid) to authenticated, service_role;

create policy "security_audit_owner_or_platform_read" on public.security_audit_events
for select to authenticated
using (public.is_platform_admin() or (business_id is not null and public.is_business_owner(business_id)));

create or replace function public.audit_membership_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_business_id uuid;
  v_target_id uuid;
  v_old_role text;
  v_new_role text;
begin
  if TG_OP = 'INSERT' then
    v_business_id := new.business_id;
    v_target_id := new.user_id;
    v_new_role := new.role::text;
  elsif TG_OP = 'DELETE' then
    v_business_id := old.business_id;
    v_target_id := old.user_id;
    v_old_role := old.role::text;
  else
    v_business_id := new.business_id;
    v_target_id := new.user_id;
    v_old_role := old.role::text;
    v_new_role := new.role::text;
  end if;
  insert into public.security_audit_events (actor_id, business_id, action, outcome, target_id, metadata)
  values (
    auth.uid(), v_business_id, 'authorization.membership_' || lower(TG_OP),
    'success', v_target_id,
    jsonb_build_object('old_role', v_old_role, 'new_role', v_new_role)
  );
  if TG_OP = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function public.protect_own_membership_privileges()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() = 'service_role' or public.is_platform_admin() then
    if TG_OP = 'DELETE' then return old; end if;
    return new;
  end if;
  if TG_OP = 'DELETE' and old.user_id = auth.uid() then
    raise exception 'No puede eliminar su propia membresía' using errcode = '42501';
  end if;
  if TG_OP = 'UPDATE' then
    if old.business_id is distinct from new.business_id or old.user_id is distinct from new.user_id then
      raise exception 'La identidad de una membresía no se puede modificar' using errcode = '42501';
    end if;
    if old.user_id = auth.uid() and (old.role is distinct from new.role or old.active is distinct from new.active) then
      raise exception 'No puede modificar sus propios privilegios' using errcode = '42501';
    end if;
  end if;
  if TG_OP = 'INSERT' and new.user_id = auth.uid() then
    raise exception 'No puede asignarse una membresía' using errcode = '42501';
  end if;
  if TG_OP = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function public.audit_profile_privilege_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.role is distinct from new.role or old.active is distinct from new.active then
    insert into public.security_audit_events (actor_id, action, outcome, target_id, metadata)
    values (auth.uid(), 'authorization.profile_changed', 'success', new.id, jsonb_build_object('old_role', old.role::text, 'new_role', new.role::text, 'old_active', old.active, 'new_active', new.active));
  end if;
  return new;
end;
$$;

drop trigger if exists business_members_security_audit on public.business_members;
create trigger business_members_security_audit after insert or update or delete on public.business_members for each row execute function public.audit_membership_change();
drop trigger if exists business_members_protect_own_privileges on public.business_members;
create trigger business_members_protect_own_privileges before insert or update or delete on public.business_members for each row execute function public.protect_own_membership_privileges();
drop trigger if exists profiles_security_audit on public.profiles;
create trigger profiles_security_audit after update on public.profiles for each row execute function public.audit_profile_privilege_change();
revoke all on function public.audit_membership_change() from public, anon, authenticated;
revoke all on function public.protect_own_membership_privileges() from public, anon, authenticated;
revoke all on function public.audit_profile_privilege_change() from public, anon, authenticated;

-- No registrar tokens o rutas privadas en el historial de cambios de negocio.
create or replace function public.write_audit_log()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  target_id uuid;
  tenant_id uuid;
  old_json jsonb;
  new_json jsonb;
begin
  if TG_OP = 'DELETE' then target_id := old.id; else target_id := new.id; end if;
  if TG_OP in ('UPDATE', 'DELETE') then old_json := to_jsonb(old) - 'public_token' - 'public_token_hash' - 'proof_path' - 'original_file_name'; end if;
  if TG_OP in ('INSERT', 'UPDATE') then new_json := to_jsonb(new) - 'public_token' - 'public_token_hash' - 'proof_path' - 'original_file_name'; end if;
  tenant_id := nullif(coalesce(new_json ->> 'business_id', old_json ->> 'business_id'), '')::uuid;
  insert into public.audit_logs (actor_id, business_id, table_name, record_id, action, old_data, new_data)
  values (auth.uid(), tenant_id, TG_TABLE_NAME, target_id, TG_OP, old_json, new_json);
  if TG_OP = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function public.write_audit_log() from public, anon, authenticated;

-- Tokens públicos de reserva: solo se conserva SHA-256, nunca el portador original.
alter table public.reservations add column if not exists public_token_hash text;
update public.reservations
set public_token_hash = encode(extensions.digest(public_token::text, 'sha256'), 'hex')
where public_token_hash is null and public_token is not null;
alter table public.reservations alter column public_token_hash set not null;
create unique index if not exists reservations_public_token_hash_idx on public.reservations (public_token_hash);
alter table public.reservations alter column public_token drop not null;
alter table public.reservations alter column public_token drop default;
alter table public.reservations disable trigger reservations_audit;
update public.reservations set public_token = null where public_token is not null;
alter table public.reservations enable trigger reservations_audit;

create or replace function public.create_public_reservation(
  p_field_id uuid, p_reservation_date date, p_start_time time, p_end_time time,
  p_customer_name text, p_customer_phone text, p_customer_email text default null
)
returns table(reservation_code text, public_token uuid, expires_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare
  v_customer_id uuid; v_business_id uuid; v_rate numeric(12,2); v_hold integer;
  v_total numeric(12,2); v_code text; v_token uuid; v_expires timestamptz;
begin
  if p_reservation_date < (now() at time zone 'America/Costa_Rica')::date
     or (p_reservation_date = (now() at time zone 'America/Costa_Rica')::date and p_start_time <= (now() at time zone 'America/Costa_Rica')::time)
     or p_end_time <= p_start_time then raise exception 'Horario no válido' using errcode = 'P0001'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_field_id::text || p_reservation_date::text, 0));
  perform public.expire_stale_reservations();
  select f.business_id, f.hourly_rate, s.hold_minutes into v_business_id, v_rate, v_hold
  from public.fields f join public.businesses b on b.id = f.business_id join public.business_settings s on s.field_id = f.id
  where f.id = p_field_id and f.active and b.active and b.subscription_status not in ('canceled', 'suspended');
  if v_business_id is null then raise exception 'Cancha no disponible' using errcode = 'P0001'; end if;
  if exists (select 1 from public.blocked_slots where field_id = p_field_id and blocked_date = p_reservation_date
    and tsrange(p_reservation_date + start_time, p_reservation_date + end_time, '[)') && tsrange(p_reservation_date + p_start_time, p_reservation_date + p_end_time, '[)'))
  then raise exception 'Horario bloqueado' using errcode = 'P0001'; end if;
  insert into public.customers (business_id, full_name, phone, email)
  values (v_business_id, left(trim(p_customer_name),100), left(trim(p_customer_phone),20), nullif(lower(trim(p_customer_email)),''))
  on conflict (business_id,phone) do update set full_name=excluded.full_name,email=coalesce(excluded.email,public.customers.email),updated_at=now()
  returning id into v_customer_id;
  v_total := round(v_rate * (extract(epoch from (p_end_time-p_start_time))/3600),2);
  v_code := 'CF-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  v_token := gen_random_uuid(); v_expires := now() + make_interval(mins => v_hold);
  insert into public.reservations (business_id,reservation_code,public_token,public_token_hash,field_id,customer_id,reservation_date,start_time,end_time,status,payment_status,subtotal,total,source,expires_at)
  values (v_business_id,v_code,null,encode(extensions.digest(v_token::text,'sha256'),'hex'),p_field_id,v_customer_id,p_reservation_date,p_start_time,p_end_time,'awaiting_payment','unpaid',v_total,v_total,'website',v_expires);
  return query select v_code,v_token,v_expires;
end;
$$;

-- Matriz de mínimo privilegio en la base de datos.
drop policy if exists "businesses_member_write" on public.businesses;
create policy "businesses_owner_write" on public.businesses for update to authenticated using (public.can_configure_business(id)) with check (public.can_configure_business(id));
drop policy if exists "members_scoped" on public.business_members;
create policy "members_own_or_owner_read" on public.business_members for select to authenticated using (user_id = auth.uid() or public.is_business_owner(business_id));
drop policy if exists "fields_tenant_write" on public.fields;
create policy "fields_owner_write" on public.fields for all to authenticated using (public.can_configure_business(business_id)) with check (public.can_configure_business(business_id));
drop policy if exists "settings_public_read" on public.business_settings;
drop policy if exists "settings_tenant_write" on public.business_settings;
create policy "settings_tenant_read" on public.business_settings for select to authenticated using (public.can_access_business(business_id));
create policy "settings_owner_write" on public.business_settings for all to authenticated using (public.can_configure_business(business_id)) with check (public.can_configure_business(business_id));
drop policy if exists "subscriptions_tenant_read" on public.subscriptions;
create policy "subscriptions_owner_read" on public.subscriptions for select to authenticated using (public.is_business_owner(business_id));
drop policy if exists "expenses_tenant_all" on public.expenses;
create policy "expenses_owner_all" on public.expenses for all to authenticated using (public.is_business_owner(business_id)) with check (public.is_business_owner(business_id));
drop policy if exists "audit_tenant_read" on public.audit_logs;
create policy "audit_owner_read" on public.audit_logs for select to authenticated using (public.is_platform_admin() or (business_id is not null and public.is_business_owner(business_id)));

drop policy if exists "payment_proofs_admin_read" on storage.objects;
drop policy if exists "payment_proofs_admin_delete" on storage.objects;
create policy "payment_proofs_tenant_read" on storage.objects for select to authenticated using (
  bucket_id = 'payment-proofs' and exists (select 1 from public.payments p where p.proof_path = name and public.can_access_business(p.business_id))
);
create policy "payment_proofs_owner_delete" on storage.objects for delete to authenticated using (
  bucket_id = 'payment-proofs' and exists (select 1 from public.payments p where p.proof_path = name and public.is_business_owner(p.business_id))
);

-- SECURITY DEFINER nunca queda ejecutable por PUBLIC de forma implícita.
revoke all on function public.create_admin_reservation(uuid,date,time,time,text,text,text,public.reservation_source,public.reservation_status,text) from public, anon;
revoke all on function public.create_blocked_slot(uuid,date,time,time,text) from public, anon;
revoke all on function public.update_admin_reservation_schedule(uuid,date,time,time,text) from public, anon;
revoke all on function public.review_reservation_payment(uuid,public.payment_status,public.reservation_status) from public, anon;
grant execute on function public.create_admin_reservation(uuid,date,time,time,text,text,text,public.reservation_source,public.reservation_status,text) to authenticated;
grant execute on function public.create_blocked_slot(uuid,date,time,time,text) to authenticated;
grant execute on function public.update_admin_reservation_schedule(uuid,date,time,time,text) to authenticated;
grant execute on function public.review_reservation_payment(uuid,public.payment_status,public.reservation_status) to authenticated;
