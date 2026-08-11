-- Tipos del módulo de finanzas.
--
-- Va en un archivo aparte porque Postgres no permite usar un valor recién
-- agregado con `alter type ... add value` dentro de la misma transacción que lo
-- creó. La migración siguiente (20260811000240_finance_module.sql) ya puede
-- referenciar todo lo que se declara aquí.

-- Tarjeta faltaba entre los métodos de cobro que acepta el negocio.
alter type public.payment_method add value if not exists 'card';

-- Una reserva puede quedar cobrada a medias: el cliente adelanta una parte y
-- el resto queda como saldo pendiente.
alter type public.payment_status add value if not exists 'partial';

do $$ begin
  create type public.finance_type as enum ('income', 'expense');
exception when duplicate_object then null; end $$;

-- Estados del libro financiero. No se reutiliza public.payment_status porque
-- ese enum describe la revisión de un comprobante de reserva, no el estado de
-- un movimiento contable.
do $$ begin
  create type public.finance_status as enum ('paid', 'pending', 'partial', 'refunded', 'cancelled');
exception when duplicate_object then null; end $$;

-- 'reservation' lo genera el sistema desde una reserva y es de solo lectura en
-- Finanzas; 'manual' lo registra el dueño a mano.
do $$ begin
  create type public.finance_source as enum ('reservation', 'manual');
exception when duplicate_object then null; end $$;
