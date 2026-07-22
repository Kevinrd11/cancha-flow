-- CanchaFlow: evolución segura del esquema existente a SaaS multiempresa.
-- Conserva los registros actuales y los asigna a un negocio legado antes de exigir business_id.

do $$ begin create type public.business_role as enum ('owner', 'staff'); exception when duplicate_object then null; end $$;
do $$ begin create type public.subscription_status as enum ('trial', 'active', 'past_due', 'canceled', 'suspended'); exception when duplicate_object then null; end $$;
do $$ begin create type public.billing_interval as enum ('monthly', 'annual'); exception when duplicate_object then null; end $$;

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(), name text not null check (char_length(name) between 2 and 100),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'), description text, phone text,
  whatsapp_phone text, email text, location text not null, currency char(3) not null default 'CRC',
  timezone text not null default 'America/Costa_Rica', logo_url text,
  primary_color text not null default '#126B45' check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  subscription_status public.subscription_status not null default 'trial', active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
insert into public.businesses (id,name,slug,description,phone,whatsapp_phone,email,location)
values ('00000000-0000-4000-8000-000000000010','Arena Central','arena-central','Complejo deportivo con espacios para fútbol, pádel y eventos privados.','22224400','50688881212','reservas@arenacentral.cr','San José, Costa Rica')
on conflict (id) do nothing;

create table if not exists public.business_members (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, role public.business_role not null default 'staff',
  active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (business_id,user_id)
);
create index if not exists business_members_user_idx on public.business_members (user_id,active);
insert into public.business_members (business_id,user_id,role) select '00000000-0000-4000-8000-000000000010',id,'owner' from public.profiles where role='admin' on conflict (business_id,user_id) do nothing;
update public.profiles set role='owner' where role='admin';

alter table public.fields add column if not exists business_id uuid references public.businesses(id) on delete cascade;
alter table public.fields add column if not exists sport text not null default 'Fútbol 5';
alter table public.fields add column if not exists reservation_minutes integer not null default 60 check (reservation_minutes between 30 and 240);
alter table public.fields add column if not exists rules jsonb not null default '[]'::jsonb check (jsonb_typeof(rules)='array');
alter table public.fields add column if not exists amenities jsonb not null default '[]'::jsonb check (jsonb_typeof(amenities)='array');
alter table public.fields add column if not exists image_url text;
update public.fields set business_id='00000000-0000-4000-8000-000000000010' where business_id is null;
alter table public.fields alter column business_id set not null;
create index if not exists fields_business_idx on public.fields (business_id,active);

alter table public.customers add column if not exists business_id uuid references public.businesses(id) on delete cascade;
update public.customers c set business_id=coalesce((select f.business_id from public.reservations r join public.fields f on f.id=r.field_id where r.customer_id=c.id limit 1),'00000000-0000-4000-8000-000000000010') where business_id is null;
alter table public.customers alter column business_id set not null;
alter table public.customers drop constraint if exists customers_phone_key;
alter table public.customers add constraint customers_business_phone_key unique (business_id,phone);
create index if not exists customers_business_idx on public.customers (business_id,created_at desc);

alter table public.reservations add column if not exists business_id uuid references public.businesses(id) on delete cascade;
update public.reservations r set business_id=f.business_id from public.fields f where f.id=r.field_id and r.business_id is null;
alter table public.reservations alter column business_id set not null;
alter table public.reservations drop constraint if exists reservations_reservation_code_check;
alter table public.reservations add constraint reservations_reservation_code_check check (reservation_code ~ '^(CF|LD)-[A-Z0-9]{6,12}$');
create index if not exists reservations_business_date_idx on public.reservations (business_id,reservation_date,start_time);

alter table public.payments add column if not exists business_id uuid references public.businesses(id) on delete cascade;
update public.payments p set business_id=r.business_id from public.reservations r where r.id=p.reservation_id and p.business_id is null;
alter table public.payments alter column business_id set not null;
create index if not exists payments_business_idx on public.payments (business_id,created_at desc);
alter table public.blocked_slots add column if not exists business_id uuid references public.businesses(id) on delete cascade;
update public.blocked_slots b set business_id=f.business_id from public.fields f where f.id=b.field_id and b.business_id is null;
alter table public.blocked_slots alter column business_id set not null;
alter table public.business_settings add column if not exists business_id uuid references public.businesses(id) on delete cascade;
update public.business_settings s set business_id=f.business_id from public.fields f where f.id=s.field_id and s.business_id is null;
alter table public.business_settings alter column business_id set not null;
alter table public.audit_logs add column if not exists business_id uuid references public.businesses(id) on delete set null;

create table if not exists public.venues (id uuid primary key default gen_random_uuid(),business_id uuid not null references public.businesses(id) on delete cascade,name text not null,location text not null,active boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
alter table public.fields add column if not exists venue_id uuid references public.venues(id) on delete set null;
create table if not exists public.sports (id uuid primary key default gen_random_uuid(),name text not null unique,active boolean not null default true);
insert into public.sports (name) values ('Fútbol 5'),('Fútbol 7'),('Pádel'),('Tenis'),('Básquet'),('Voleibol'),('Multideporte') on conflict (name) do nothing;
create table if not exists public.plans (id uuid primary key default gen_random_uuid(),code text not null unique,name text not null,monthly_price numeric(12,2) not null,annual_price numeric(12,2) not null,max_courts integer,max_staff integer,advanced_reports boolean not null default false,custom_branding boolean not null default false,integrations boolean not null default false,priority_support boolean not null default false,active boolean not null default true);
insert into public.plans (code,name,monthly_price,annual_price,max_courts,max_staff,advanced_reports,custom_branding,integrations,priority_support) values
('starter','Inicial',19900,199000,2,1,false,false,false,false),('pro','Pro',39900,399000,8,5,true,true,false,false),('scale','Escala',74900,749000,null,15,true,true,true,true)
on conflict (code) do update set name=excluded.name,monthly_price=excluded.monthly_price,annual_price=excluded.annual_price;
create table if not exists public.subscriptions (id uuid primary key default gen_random_uuid(),business_id uuid not null unique references public.businesses(id) on delete cascade,plan_id uuid not null references public.plans(id),status public.subscription_status not null default 'trial',billing_interval public.billing_interval not null default 'monthly',trial_ends_at timestamptz,current_period_starts_at timestamptz,current_period_ends_at timestamptz,external_customer_id text,external_subscription_id text,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
insert into public.subscriptions (business_id,plan_id,status,billing_interval,trial_ends_at) select '00000000-0000-4000-8000-000000000010',id,'trial','monthly',now()+interval '14 days' from public.plans where code='pro' on conflict (business_id) do nothing;
create table if not exists public.expenses (id uuid primary key default gen_random_uuid(),business_id uuid not null references public.businesses(id) on delete cascade,category text not null,description text not null,amount numeric(12,2) not null check (amount>0),expense_date date not null,receipt_url text,created_by uuid references public.profiles(id) on delete set null,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists expenses_business_date_idx on public.expenses (business_id,expense_date desc);
create table if not exists public.notifications (id uuid primary key default gen_random_uuid(),business_id uuid not null references public.businesses(id) on delete cascade,user_id uuid references auth.users(id) on delete cascade,type text not null,title text not null,body text not null,read_at timestamptz,created_at timestamptz not null default now());

create or replace function public.is_platform_admin() returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.profiles where id=auth.uid() and role='platform_admin' and active=true); $$;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$ select public.is_platform_admin(); $$;
create or replace function public.can_access_business(p_business_id uuid) returns boolean language sql stable security definer set search_path='' as $$ select public.is_platform_admin() or exists(select 1 from public.business_members where user_id=auth.uid() and business_id=p_business_id and active=true); $$;
create or replace function public.can_manage_business(p_business_id uuid) returns boolean language sql stable security definer set search_path='' as $$ select public.is_platform_admin() or exists(select 1 from public.business_members where user_id=auth.uid() and business_id=p_business_id and active=true and role in ('owner','staff')); $$;
create or replace function public.is_business_owner(p_business_id uuid) returns boolean language sql stable security definer set search_path='' as $$ select public.is_platform_admin() or exists(select 1 from public.business_members where user_id=auth.uid() and business_id=p_business_id and active=true and role='owner'); $$;

drop policy if exists "profiles_read_own_or_admin" on public.profiles; drop policy if exists "profiles_admin_all" on public.profiles;
drop policy if exists "fields_public_read_active" on public.fields; drop policy if exists "fields_admin_write" on public.fields;
drop policy if exists "customers_admin_all" on public.customers; drop policy if exists "reservations_admin_all" on public.reservations;
drop policy if exists "payments_admin_all" on public.payments; drop policy if exists "blocked_slots_admin_all" on public.blocked_slots;
drop policy if exists "settings_public_read" on public.business_settings; drop policy if exists "settings_admin_write" on public.business_settings;
drop policy if exists "audit_admin_read" on public.audit_logs;
alter table public.businesses enable row level security; alter table public.business_members enable row level security; alter table public.venues enable row level security;
alter table public.sports enable row level security; alter table public.plans enable row level security; alter table public.subscriptions enable row level security;
alter table public.expenses enable row level security; alter table public.notifications enable row level security;
create policy "profiles_own_or_platform" on public.profiles for select to authenticated using (id=auth.uid() or public.is_platform_admin());
create policy "profiles_platform_write" on public.profiles for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy "businesses_public_or_member_read" on public.businesses for select to anon,authenticated using (active=true or public.can_access_business(id));
create policy "businesses_member_write" on public.businesses for update to authenticated using (public.can_manage_business(id)) with check (public.can_manage_business(id));
create policy "members_scoped" on public.business_members for select to authenticated using (user_id=auth.uid() or public.can_access_business(business_id));
create policy "members_owner_write" on public.business_members for all to authenticated using (public.is_business_owner(business_id)) with check (public.is_business_owner(business_id));
create policy "fields_public_read_active" on public.fields for select to anon,authenticated using (active=true or public.can_access_business(business_id));
create policy "fields_tenant_write" on public.fields for all to authenticated using (public.can_manage_business(business_id)) with check (public.can_manage_business(business_id));
create policy "customers_tenant_all" on public.customers for all to authenticated using (public.can_access_business(business_id)) with check (public.can_manage_business(business_id));
create policy "reservations_tenant_all" on public.reservations for all to authenticated using (public.can_access_business(business_id)) with check (public.can_manage_business(business_id));
create policy "payments_tenant_all" on public.payments for all to authenticated using (public.can_access_business(business_id)) with check (public.can_manage_business(business_id));
create policy "blocked_tenant_all" on public.blocked_slots for all to authenticated using (public.can_access_business(business_id)) with check (public.can_manage_business(business_id));
create policy "settings_public_read" on public.business_settings for select to anon,authenticated using (true);
create policy "settings_tenant_write" on public.business_settings for all to authenticated using (public.can_access_business(business_id)) with check (public.can_manage_business(business_id));
create policy "audit_tenant_read" on public.audit_logs for select to authenticated using (public.is_platform_admin() or (business_id is not null and public.can_access_business(business_id)));
create policy "venues_public_read" on public.venues for select to anon,authenticated using (active=true or public.can_access_business(business_id));
create policy "venues_tenant_write" on public.venues for all to authenticated using (public.can_manage_business(business_id)) with check (public.can_manage_business(business_id));
create policy "sports_public_read" on public.sports for select to anon,authenticated using (active=true);
create policy "plans_public_read" on public.plans for select to anon,authenticated using (active=true);
create policy "subscriptions_tenant_read" on public.subscriptions for select to authenticated using (public.can_access_business(business_id));
create policy "subscriptions_platform_write" on public.subscriptions for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy "expenses_tenant_all" on public.expenses for all to authenticated using (public.can_access_business(business_id)) with check (public.can_manage_business(business_id));
create policy "notifications_tenant_read" on public.notifications for select to authenticated using (public.can_access_business(business_id) and (user_id is null or user_id=auth.uid()));

create or replace function public.create_admin_reservation(p_field_id uuid,p_reservation_date date,p_start_time time,p_end_time time,p_customer_name text,p_customer_phone text,p_customer_email text,p_source public.reservation_source,p_status public.reservation_status,p_notes text default null)
returns text language plpgsql security definer set search_path='' as $$ declare v_customer_id uuid; v_business_id uuid; v_rate numeric(12,2); v_total numeric(12,2); v_code text;
begin select business_id,hourly_rate into v_business_id,v_rate from public.fields where id=p_field_id and active=true; if v_business_id is null or not public.can_manage_business(v_business_id) then raise exception 'No autorizado' using errcode='42501'; end if; if p_end_time<=p_start_time then raise exception 'Horario inválido' using errcode='P0001'; end if; perform pg_advisory_xact_lock(hashtextextended(p_field_id::text||p_reservation_date::text,0)); if exists(select 1 from public.blocked_slots where field_id=p_field_id and blocked_date=p_reservation_date and tsrange(p_reservation_date+start_time,p_reservation_date+end_time,'[)')&&tsrange(p_reservation_date+p_start_time,p_reservation_date+p_end_time,'[)')) then raise exception 'Horario bloqueado' using errcode='P0001'; end if;
insert into public.customers (business_id,full_name,phone,email) values (v_business_id,left(trim(p_customer_name),100),left(trim(p_customer_phone),20),nullif(lower(trim(p_customer_email)),'')) on conflict (business_id,phone) do update set full_name=excluded.full_name,email=coalesce(excluded.email,public.customers.email),updated_at=now() returning id into v_customer_id; v_total:=round(v_rate*(extract(epoch from(p_end_time-p_start_time))/3600),2); v_code:='CF-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)); insert into public.reservations (business_id,reservation_code,field_id,customer_id,reservation_date,start_time,end_time,status,payment_status,subtotal,total,source,notes,created_by) values (v_business_id,v_code,p_field_id,v_customer_id,p_reservation_date,p_start_time,p_end_time,p_status,case when p_status='confirmed' then 'approved' else 'unpaid' end,v_total,v_total,p_source,nullif(trim(p_notes),''),auth.uid()); return v_code; end; $$;

create or replace function public.create_blocked_slot(p_field_id uuid,p_date date,p_start_time time,p_end_time time,p_reason text)
returns uuid language plpgsql security definer set search_path='' as $$ declare v_id uuid; v_business_id uuid; begin select business_id into v_business_id from public.fields where id=p_field_id; if v_business_id is null or not public.can_manage_business(v_business_id) then raise exception 'No autorizado' using errcode='42501'; end if; if p_end_time<=p_start_time then raise exception 'Horario inválido' using errcode='P0001'; end if; perform pg_advisory_xact_lock(hashtextextended(p_field_id::text||p_date::text,0)); if exists(select 1 from public.reservations where field_id=p_field_id and reservation_date=p_date and status in ('pending','awaiting_payment','awaiting_approval','confirmed') and tsrange(p_date+start_time,p_date+end_time,'[)')&&tsrange(p_date+p_start_time,p_date+p_end_time,'[)')) then raise exception 'El periodo contiene una reserva activa' using errcode='P0001'; end if; insert into public.blocked_slots (business_id,field_id,blocked_date,start_time,end_time,reason,created_by) values (v_business_id,p_field_id,p_date,p_start_time,p_end_time,left(trim(p_reason),300),auth.uid()) returning id into v_id; return v_id; end; $$;

create or replace function public.update_admin_reservation_schedule(p_reservation_id uuid,p_date date,p_start_time time,p_end_time time,p_notes text default null)
returns void language plpgsql security definer set search_path='' as $$ declare v_field_id uuid;v_business_id uuid; begin
  if p_end_time<=p_start_time then raise exception 'Horario inválido' using errcode='P0001'; end if;
  select field_id,business_id into v_field_id,v_business_id from public.reservations where id=p_reservation_id for update;
  if v_field_id is null then raise exception 'Reserva inexistente' using errcode='P0001'; end if;
  if not public.can_manage_business(v_business_id) then raise exception 'No autorizado' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_field_id::text||p_date::text,0));
  if exists(select 1 from public.blocked_slots where field_id=v_field_id and blocked_date=p_date and tsrange(p_date+start_time,p_date+end_time,'[)')&&tsrange(p_date+p_start_time,p_date+p_end_time,'[)')) then raise exception 'Horario bloqueado' using errcode='P0001'; end if;
  update public.reservations set reservation_date=p_date,start_time=p_start_time,end_time=p_end_time,notes=case when p_notes is null then notes else nullif(left(trim(p_notes),2000),'') end where id=p_reservation_id and business_id=v_business_id;
end; $$;

create or replace function public.review_reservation_payment(p_reservation_id uuid,p_payment_status public.payment_status,p_reservation_status public.reservation_status default null)
returns void language plpgsql security definer set search_path='' as $$ declare v_business_id uuid; begin
  select business_id into v_business_id from public.reservations where id=p_reservation_id;
  if v_business_id is null or not public.can_manage_business(v_business_id) then raise exception 'No autorizado' using errcode='42501'; end if;
  update public.payments set status=p_payment_status,reviewed_by=auth.uid(),reviewed_at=now() where id=(select id from public.payments where reservation_id=p_reservation_id and business_id=v_business_id order by created_at desc limit 1);
  update public.reservations set payment_status=p_payment_status,status=coalesce(p_reservation_status,status),expires_at=case when p_payment_status='approved' then null else expires_at end where id=p_reservation_id and business_id=v_business_id;
end; $$;

create or replace function public.create_public_reservation(p_field_id uuid,p_reservation_date date,p_start_time time,p_end_time time,p_customer_name text,p_customer_phone text,p_customer_email text default null)
returns table(reservation_code text,public_token uuid,expires_at timestamptz) language plpgsql security definer set search_path='' as $$ declare v_customer_id uuid;v_business_id uuid;v_rate numeric(12,2);v_hold integer;v_total numeric(12,2);v_code text;v_token uuid;v_expires timestamptz;
begin if p_reservation_date<(now() at time zone 'America/Costa_Rica')::date or (p_reservation_date=(now() at time zone 'America/Costa_Rica')::date and p_start_time<=(now() at time zone 'America/Costa_Rica')::time) or p_end_time<=p_start_time then raise exception 'Horario no válido' using errcode='P0001'; end if; perform pg_advisory_xact_lock(hashtextextended(p_field_id::text||p_reservation_date::text,0)); perform public.expire_stale_reservations(); select f.business_id,f.hourly_rate,s.hold_minutes into v_business_id,v_rate,v_hold from public.fields f join public.businesses b on b.id=f.business_id join public.business_settings s on s.field_id=f.id where f.id=p_field_id and f.active and b.active and b.subscription_status not in ('canceled','suspended'); if v_business_id is null then raise exception 'Cancha no disponible' using errcode='P0001'; end if; if exists(select 1 from public.blocked_slots where field_id=p_field_id and blocked_date=p_reservation_date and tsrange(p_reservation_date+start_time,p_reservation_date+end_time,'[)')&&tsrange(p_reservation_date+p_start_time,p_reservation_date+p_end_time,'[)')) then raise exception 'Horario bloqueado' using errcode='P0001'; end if;
insert into public.customers (business_id,full_name,phone,email) values (v_business_id,left(trim(p_customer_name),100),left(trim(p_customer_phone),20),nullif(lower(trim(p_customer_email)),'')) on conflict (business_id,phone) do update set full_name=excluded.full_name,email=coalesce(excluded.email,public.customers.email),updated_at=now() returning id into v_customer_id; v_total:=round(v_rate*(extract(epoch from(p_end_time-p_start_time))/3600),2);v_code:='CF-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));v_token:=gen_random_uuid();v_expires:=now()+make_interval(mins=>v_hold); insert into public.reservations (business_id,reservation_code,public_token,field_id,customer_id,reservation_date,start_time,end_time,status,payment_status,subtotal,total,source,expires_at) values (v_business_id,v_code,v_token,p_field_id,v_customer_id,p_reservation_date,p_start_time,p_end_time,'awaiting_payment','unpaid',v_total,v_total,'website',v_expires); return query select v_code,v_token,v_expires; end; $$;

create or replace function public.complete_business_onboarding(p_user_id uuid,p_owner_name text,p_business_name text,p_slug text,p_phone text,p_location text,p_description text,p_currency text,p_timezone text,p_court_name text,p_sport text,p_opening_time time,p_closing_time time,p_reservation_minutes integer,p_hourly_rate numeric,p_plan_code text,p_billing_interval public.billing_interval)
returns uuid language plpgsql security definer set search_path='' as $$ declare v_business_id uuid;v_court_id uuid;v_plan_id uuid; begin if auth.role()<>'service_role' then raise exception 'No autorizado' using errcode='42501'; end if; select id into v_plan_id from public.plans where code=p_plan_code and active=true; if v_plan_id is null then raise exception 'Plan inválido'; end if; insert into public.profiles(id,full_name,role) values(p_user_id,left(trim(p_owner_name),100),'owner') on conflict(id) do update set full_name=excluded.full_name,role='owner',active=true; insert into public.businesses(name,slug,description,phone,whatsapp_phone,email,location,currency,timezone,subscription_status) values(left(trim(p_business_name),100),p_slug,left(trim(p_description),1200),p_phone,p_phone,(select email from auth.users where id=p_user_id),left(trim(p_location),240),upper(p_currency)::char(3),p_timezone,'trial') returning id into v_business_id; insert into public.business_members(business_id,user_id,role) values(v_business_id,p_user_id,'owner'); insert into public.fields(business_id,name,slug,sport,description,location,hourly_rate,reservation_minutes,capacity) values(v_business_id,left(trim(p_court_name),100),'principal',left(trim(p_sport),60),'Primera cancha de '||left(trim(p_business_name),100),left(trim(p_location),240),p_hourly_rate,p_reservation_minutes,10) returning id into v_court_id; insert into public.business_settings(business_id,field_id,whatsapp_phone,sinpe_phone,opening_time,closing_time,minimum_reservation_minutes,hold_minutes,cancellation_policy) values(v_business_id,v_court_id,p_phone,p_phone,p_opening_time,p_closing_time,p_reservation_minutes,20,'Las cancelaciones y reprogramaciones están sujetas a las reglas del centro deportivo.'); insert into public.subscriptions(business_id,plan_id,status,billing_interval,trial_ends_at) values(v_business_id,v_plan_id,'trial',p_billing_interval,now()+interval '14 days'); return v_business_id; end; $$;
revoke all on function public.complete_business_onboarding(uuid,text,text,text,text,text,text,text,text,text,text,time,time,integer,numeric,text,public.billing_interval) from public,anon,authenticated;
grant execute on function public.complete_business_onboarding(uuid,text,text,text,text,text,text,text,text,text,text,time,time,integer,numeric,text,public.billing_interval) to service_role;

create trigger businesses_updated_at before update on public.businesses for each row execute function public.set_updated_at();
create trigger business_members_updated_at before update on public.business_members for each row execute function public.set_updated_at();
create trigger venues_updated_at before update on public.venues for each row execute function public.set_updated_at();
create trigger subscriptions_updated_at before update on public.subscriptions for each row execute function public.set_updated_at();
create trigger expenses_updated_at before update on public.expenses for each row execute function public.set_updated_at();
