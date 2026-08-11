-- Módulo de Finanzas e Ingresos.
--
-- El dueño necesita saber cuánto cobró, cuánto le deben y cuánto ganó. Para eso
-- se agrega un libro contable (public.financial_transactions) que la propia base
-- mantiene sincronizado con las reservas mediante un trigger: así da igual por
-- qué camino se escriba la reserva (RPC pública, RPC de administración, revisión
-- de pago o un update directo), el ingreso siempre queda registrado una sola vez.
--
-- Los montos siguen en numeric(12,2) como el resto del esquema: es un decimal
-- exacto de Postgres, y toda suma ocurre aquí dentro, nunca en el navegador.

-- ---------------------------------------------------------------------------
-- 1. Datos de cobro en la reserva
-- ---------------------------------------------------------------------------
-- El saldo pendiente no se guarda: siempre es total - amount_paid.
alter table public.reservations
  add column if not exists amount_paid numeric(12,2) not null default 0 check (amount_paid >= 0),
  add column if not exists payment_method public.payment_method,
  add column if not exists paid_at timestamptz;

-- Las reservas ya aprobadas se consideran cobradas por su monto completo para
-- que el histórico no aparezca como cuentas por cobrar.
update public.reservations
set amount_paid = total,
    paid_at = coalesce(paid_at, updated_at)
where payment_status = 'approved' and amount_paid = 0;

-- ---------------------------------------------------------------------------
-- 2. Libro contable
-- ---------------------------------------------------------------------------
-- amount es el valor del movimiento y amount_paid lo efectivamente cobrado o
-- pagado. Esa pareja es lo que permite el estado "parcial" sin duplicar filas.
create table if not exists public.financial_transactions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  reservation_id uuid references public.reservations(id) on delete cascade,
  type public.finance_type not null,
  source public.finance_source not null default 'manual',
  category text not null check (char_length(category) between 2 and 60),
  description text not null default '' check (char_length(description) <= 300),
  amount numeric(12,2) not null check (amount >= 0),
  amount_paid numeric(12,2) not null default 0 check (amount_paid >= 0),
  payment_method public.payment_method,
  payment_status public.finance_status not null default 'pending',
  transaction_date date not null,
  note text check (note is null or char_length(note) <= 1000),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_paid_within_amount check (amount_paid <= amount),
  -- Un movimiento automático siempre apunta a su reserva; uno manual puede o no.
  constraint finance_reservation_is_automatic check (source = 'manual' or reservation_id is not null)
);

-- Una reserva tiene como máximo un ingreso automático. Es lo que hace que el
-- trigger de sincronización sea idempotente.
create unique index if not exists financial_transactions_reservation_uniq
  on public.financial_transactions (reservation_id) where source = 'reservation';

create index if not exists financial_transactions_business_date_idx
  on public.financial_transactions (business_id, transaction_date desc);
create index if not exists financial_transactions_business_type_idx
  on public.financial_transactions (business_id, type, payment_status);
create index if not exists financial_transactions_business_method_idx
  on public.financial_transactions (business_id, payment_method);

drop trigger if exists financial_transactions_updated_at on public.financial_transactions;
create trigger financial_transactions_updated_at
  before update on public.financial_transactions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Traducción de una reserva a un movimiento financiero
-- ---------------------------------------------------------------------------
-- Un reembolso se informa como reembolso aunque la reserva esté cancelada, y una
-- reserva cancelada nunca cuenta como ingreso efectivo.
create or replace function public.finance_status_for_reservation(
  p_status public.reservation_status,
  p_payment_status public.payment_status,
  p_total numeric,
  p_amount_paid numeric
)
returns public.finance_status
language sql
immutable
as $$
  select case
    when p_payment_status = 'refunded' then 'refunded'::public.finance_status
    when p_status in ('cancelled', 'expired', 'no_show') then 'cancelled'
    when p_payment_status = 'approved' or (p_total > 0 and p_amount_paid >= p_total) then 'paid'
    when p_amount_paid > 0 then 'partial'
    else 'pending'
  end;
$$;

create or replace function public.finance_paid_for_reservation(
  p_status public.reservation_status,
  p_payment_status public.payment_status,
  p_total numeric,
  p_amount_paid numeric
)
returns numeric
language sql
immutable
as $$
  select case public.finance_status_for_reservation(p_status, p_payment_status, p_total, p_amount_paid)
    when 'paid' then p_total
    when 'partial' then least(p_amount_paid, p_total)
    else 0::numeric
  end;
$$;

create or replace function public.sync_reservation_transaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.financial_transactions (
    business_id, reservation_id, type, source, category, description,
    amount, amount_paid, payment_method, payment_status, transaction_date, created_by
  ) values (
    new.business_id, new.id, 'income', 'reservation', 'court_reservation',
    'Reserva ' || new.reservation_code,
    new.total,
    public.finance_paid_for_reservation(new.status, new.payment_status, new.total, new.amount_paid),
    new.payment_method,
    public.finance_status_for_reservation(new.status, new.payment_status, new.total, new.amount_paid),
    new.reservation_date,
    new.created_by
  )
  on conflict (reservation_id) where source = 'reservation' do update set
    business_id = excluded.business_id,
    amount = excluded.amount,
    amount_paid = excluded.amount_paid,
    payment_method = excluded.payment_method,
    payment_status = excluded.payment_status,
    transaction_date = excluded.transaction_date,
    description = excluded.description;
  return null;
end;
$$;

drop trigger if exists reservations_sync_finance on public.reservations;
create trigger reservations_sync_finance
  after insert or update of status, payment_status, total, amount_paid, payment_method, reservation_date, reservation_code
  on public.reservations
  for each row execute function public.sync_reservation_transaction();

-- ---------------------------------------------------------------------------
-- 4. Los ingresos automáticos no se editan desde Finanzas
-- ---------------------------------------------------------------------------
-- Para cambiar el monto o el estado de un ingreso de reserva hay que editar la
-- reserva. pg_trigger_depth() distingue la escritura directa del cliente (1) de
-- la que viene encadenada desde sync_reservation_transaction (2).
create or replace function public.guard_reservation_transaction()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if pg_trigger_depth() > 1 then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  if tg_op = 'DELETE' then
    raise exception 'Los ingresos generados por reservas no se pueden eliminar' using errcode = '42501';
  end if;
  if new.amount is distinct from old.amount
     or new.amount_paid is distinct from old.amount_paid
     or new.payment_status is distinct from old.payment_status
     or new.transaction_date is distinct from old.transaction_date
     or new.type is distinct from old.type
     or new.source is distinct from old.source
     or new.reservation_id is distinct from old.reservation_id then
    raise exception 'Modifique la reserva para cambiar este ingreso' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists financial_transactions_guard on public.financial_transactions;
create trigger financial_transactions_guard
  before update or delete on public.financial_transactions
  for each row when (old.source = 'reservation')
  execute function public.guard_reservation_transaction();

-- ---------------------------------------------------------------------------
-- 5. Aislamiento por negocio
-- ---------------------------------------------------------------------------
-- La información financiera es exclusiva del propietario: el personal operativo
-- gestiona reservas, no dinero. is_business_owner ya incluye al platform_admin.
alter table public.financial_transactions enable row level security;

drop policy if exists "finance_owner_read" on public.financial_transactions;
create policy "finance_owner_read" on public.financial_transactions for select
  to authenticated using (public.is_business_owner(business_id));

drop policy if exists "finance_owner_write" on public.financial_transactions;
create policy "finance_owner_write" on public.financial_transactions for all
  to authenticated
  using (public.is_business_owner(business_id))
  with check (public.is_business_owner(business_id));

-- ---------------------------------------------------------------------------
-- 6. Migración de lo que ya existía
-- ---------------------------------------------------------------------------
-- public.expenses se conserva intacta por compatibilidad; simplemente deja de
-- ser la fuente de verdad.
insert into public.financial_transactions (
  business_id, type, source, category, description, amount, amount_paid,
  payment_method, payment_status, transaction_date, note, created_by, created_at
)
select e.business_id, 'expense', 'manual', left(e.category, 60), left(e.description, 300),
       e.amount, e.amount, null, 'paid', e.expense_date, e.receipt_url, e.created_by, e.created_at
from public.expenses e
where not exists (
  select 1 from public.financial_transactions t
  where t.source = 'manual' and t.type = 'expense'
    and t.business_id = e.business_id and t.transaction_date = e.expense_date
    and t.amount = e.amount and t.description = left(e.description, 300)
);

insert into public.financial_transactions (
  business_id, reservation_id, type, source, category, description,
  amount, amount_paid, payment_method, payment_status, transaction_date, created_by, created_at
)
select r.business_id, r.id, 'income', 'reservation', 'court_reservation',
       'Reserva ' || r.reservation_code,
       r.total,
       public.finance_paid_for_reservation(r.status, r.payment_status, r.total, r.amount_paid),
       r.payment_method,
       public.finance_status_for_reservation(r.status, r.payment_status, r.total, r.amount_paid),
       r.reservation_date, r.created_by, r.created_at
from public.reservations r
on conflict (reservation_id) where source = 'reservation' do nothing;

-- ---------------------------------------------------------------------------
-- 7. Agregación en la base de datos
-- ---------------------------------------------------------------------------
-- Una sola llamada devuelve todo lo que pintan las tarjetas, las gráficas y la
-- exportación, para que las tres nunca puedan contradecirse.
--
--   cobrado       = Σ amount_paid            (ingresos pagados o parciales)
--   pendiente     = Σ (amount - amount_paid) (ingresos pendientes o parciales)
--   gastos        = Σ amount_paid            (gastos pagados o parciales)
--   ganancia neta = cobrado - gastos         (lo pendiente nunca entra aquí)
create or replace function public.get_finance_overview(
  p_business_id uuid,
  p_from date,
  p_to date,
  p_payment_method text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_method public.payment_method;
  v_span integer;
  v_prev_from date;
  v_prev_to date;
  v_monthly boolean;
  v_result jsonb;
begin
  if p_business_id is null or not public.is_business_owner(p_business_id) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if p_from is null or p_to is null or p_to < p_from then
    raise exception 'Rango de fechas inválido' using errcode = 'P0001';
  end if;

  v_method := nullif(trim(coalesce(p_payment_method, '')), '')::public.payment_method;
  v_span := (p_to - p_from) + 1;
  -- Un mes calendario se compara con el mes anterior y un año con el año
  -- anterior; cualquier otro rango, con la ventana anterior del mismo largo.
  if p_from = date_trunc('month', p_from)::date and p_to = (date_trunc('month', p_from) + interval '1 month - 1 day')::date then
    v_prev_from := (date_trunc('month', p_from) - interval '1 month')::date;
    v_prev_to := p_from - 1;
  elsif p_from = date_trunc('year', p_from)::date and p_to = (date_trunc('year', p_from) + interval '1 year - 1 day')::date then
    v_prev_from := (date_trunc('year', p_from) - interval '1 year')::date;
    v_prev_to := p_from - 1;
  else
    v_prev_from := p_from - v_span;
    v_prev_to := p_from - 1;
  end if;
  -- Más de un trimestre se lee mejor por mes que por día.
  v_monthly := v_span > 92;

  with base as (
    select t.reservation_id, t.source, t.type, t.payment_status, t.payment_method,
           t.amount, t.amount_paid, t.transaction_date
    from public.financial_transactions t
    where t.business_id = p_business_id
      and t.transaction_date between v_prev_from and p_to
      and (v_method is null or t.payment_method = v_method)
  ),
  current_rows as (select * from base where transaction_date between p_from and p_to),
  previous_rows as (select * from base where transaction_date between v_prev_from and v_prev_to),
  current_totals as (
    select
      coalesce(sum(amount_paid) filter (where type = 'income' and payment_status in ('paid', 'partial')), 0) as collected,
      coalesce(sum(amount - amount_paid) filter (where type = 'income' and payment_status in ('pending', 'partial')), 0) as pending,
      coalesce(sum(amount_paid) filter (where type = 'expense' and payment_status in ('paid', 'partial')), 0) as expenses,
      coalesce(sum(amount) filter (where type = 'income' and payment_status = 'refunded'), 0) as refunded,
      count(*) filter (where source = 'reservation' and payment_status = 'paid') as paid_reservations,
      coalesce(sum(amount_paid) filter (where source = 'reservation' and payment_status in ('paid', 'partial')), 0) as reservation_collected,
      count(*) filter (where source = 'reservation' and payment_status in ('paid', 'partial')) as billed_reservations
    from current_rows
  ),
  previous_totals as (
    select
      coalesce(sum(amount_paid) filter (where type = 'income' and payment_status in ('paid', 'partial')), 0) as collected,
      coalesce(sum(amount - amount_paid) filter (where type = 'income' and payment_status in ('pending', 'partial')), 0) as pending,
      coalesce(sum(amount_paid) filter (where type = 'expense' and payment_status in ('paid', 'partial')), 0) as expenses,
      count(*) filter (where source = 'reservation' and payment_status = 'paid') as paid_reservations
    from previous_rows
  ),
  current_buckets as (
    select generate_series(
      case when v_monthly then date_trunc('month', p_from)::date else p_from end,
      p_to,
      case when v_monthly then interval '1 month' else interval '1 day' end
    )::date as bucket
  ),
  previous_buckets as (
    select generate_series(
      case when v_monthly then date_trunc('month', v_prev_from)::date else v_prev_from end,
      v_prev_to,
      case when v_monthly then interval '1 month' else interval '1 day' end
    )::date as bucket
  ),
  current_series as (
    select b.bucket,
      coalesce(sum(c.amount_paid) filter (where c.type = 'income' and c.payment_status in ('paid', 'partial')), 0) as collected,
      coalesce(sum(c.amount_paid) filter (where c.type = 'expense' and c.payment_status in ('paid', 'partial')), 0) as expenses
    from current_buckets b
    left join current_rows c
      on (case when v_monthly then date_trunc('month', c.transaction_date)::date else c.transaction_date end) = b.bucket
    group by b.bucket
  ),
  previous_series as (
    select b.bucket,
      coalesce(sum(p.amount_paid) filter (where p.type = 'income' and p.payment_status in ('paid', 'partial')), 0) as collected
    from previous_buckets b
    left join previous_rows p
      on (case when v_monthly then date_trunc('month', p.transaction_date)::date else p.transaction_date end) = b.bucket
    group by b.bucket
  ),
  -- Cuántas veces cae cada día de la semana dentro del periodo, para el promedio.
  weekday_calendar as (
    select extract(isodow from d)::int as weekday, count(*)::int as occurrences
    from generate_series(p_from, p_to, interval '1 day') d
    group by 1
  ),
  weekday_totals as (
    select extract(isodow from transaction_date)::int as weekday,
           coalesce(sum(amount_paid) filter (where type = 'income' and payment_status in ('paid', 'partial')), 0) as collected
    from current_rows
    group by 1
  ),
  weekdays as (
    select w.weekday,
           coalesce(t.collected, 0) as collected,
           coalesce(c.occurrences, 0) as occurrences,
           case when coalesce(c.occurrences, 0) = 0 then 0
                else round(coalesce(t.collected, 0) / c.occurrences, 2) end as average
    from generate_series(1, 7) w(weekday)
    left join weekday_totals t on t.weekday = w.weekday
    left join weekday_calendar c on c.weekday = w.weekday
  ),
  courts as (
    select coalesce(f.name, 'Movimientos manuales') as name,
           coalesce(sum(c.amount_paid) filter (where c.type = 'income' and c.payment_status in ('paid', 'partial')), 0) as collected,
           coalesce(sum(c.amount - c.amount_paid) filter (where c.type = 'income' and c.payment_status in ('pending', 'partial')), 0) as pending
    from current_rows c
    left join public.reservations r on r.id = c.reservation_id
    left join public.fields f on f.id = r.field_id
    where c.type = 'income'
    group by 1
  ),
  methods as (
    select coalesce(c.payment_method::text, 'other') as method,
           coalesce(sum(c.amount_paid) filter (where c.payment_status in ('paid', 'partial')), 0) as collected
    from current_rows c
    where c.type = 'income'
    group by 1
  )
  select jsonb_build_object(
    'from', p_from,
    'to', p_to,
    'previousFrom', v_prev_from,
    'previousTo', v_prev_to,
    'granularity', case when v_monthly then 'month' else 'day' end,
    'totals', jsonb_build_object(
      'collected', ct.collected,
      'pending', ct.pending,
      'expenses', ct.expenses,
      'net', ct.collected - ct.expenses,
      'refunded', ct.refunded,
      'paidReservations', ct.paid_reservations,
      'averageTicket', case when ct.billed_reservations = 0 then 0
                            else round(ct.reservation_collected / ct.billed_reservations, 2) end
    ),
    'previous', jsonb_build_object(
      'collected', pt.collected,
      'pending', pt.pending,
      'expenses', pt.expenses,
      'net', pt.collected - pt.expenses,
      'paidReservations', pt.paid_reservations
    ),
    'series', coalesce((select jsonb_agg(jsonb_build_object('bucket', bucket, 'collected', collected, 'expenses', expenses) order by bucket) from current_series), '[]'::jsonb),
    'previousSeries', coalesce((select jsonb_agg(jsonb_build_object('bucket', bucket, 'collected', collected) order by bucket) from previous_series), '[]'::jsonb),
    'byWeekday', coalesce((select jsonb_agg(jsonb_build_object('weekday', weekday, 'collected', collected, 'average', average, 'occurrences', occurrences) order by weekday) from weekdays), '[]'::jsonb),
    'byCourt', coalesce((select jsonb_agg(jsonb_build_object('name', name, 'collected', collected, 'pending', pending) order by collected desc) from courts), '[]'::jsonb),
    'byMethod', coalesce((select jsonb_agg(jsonb_build_object('method', method, 'collected', collected) order by collected desc) from methods), '[]'::jsonb)
  )
  into v_result
  from current_totals ct, previous_totals pt;

  return v_result;
end;
$$;

revoke all on function public.get_finance_overview(uuid, date, date, text) from public, anon;
grant execute on function public.get_finance_overview(uuid, date, date, text) to authenticated;
revoke all on function public.finance_status_for_reservation(public.reservation_status, public.payment_status, numeric, numeric) from public, anon;
revoke all on function public.finance_paid_for_reservation(public.reservation_status, public.payment_status, numeric, numeric) from public, anon;
