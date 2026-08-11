-- La regla de "solo horas en punto" dejaba congeladas las reservas antiguas.
--
-- 20260806000220_hourly_slots.sql añadió reservations_hourly_bounds con `not
-- valid` para respetar el histórico, pero `not valid` únicamente evita revisar
-- las filas que ya existían al crear la restricción: Postgres sí la evalúa en
-- cada UPDATE posterior. El resultado era que una reserva heredada de las 11:30
-- no se podía confirmar, ni cancelar, ni cobrar — cualquier cambio la hacía
-- chocar contra una regla que nació después que ella.
--
-- Se sustituye por un trigger que exige la hora en punto solo cuando la reserva
-- se crea o se reprograma. Cambiar el estado o registrar un pago vuelve a ser
-- posible en el histórico, y las reservas nuevas siguen obligadas a caer en
-- punto.

alter table public.reservations drop constraint if exists reservations_hourly_bounds;
alter table public.blocked_slots drop constraint if exists blocked_slots_hourly_bounds;

create or replace function public.enforce_hourly_bounds()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Un UPDATE que no mueve el horario no tiene por qué revisarlo.
  if tg_op = 'UPDATE' and new.start_time = old.start_time and new.end_time = old.end_time then
    return new;
  end if;
  if extract(minute from new.start_time) <> 0 or extract(second from new.start_time) <> 0
     or extract(minute from new.end_time) <> 0 or extract(second from new.end_time) <> 0 then
    raise exception 'Los horarios deben empezar y terminar en punto' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists reservations_hourly_bounds on public.reservations;
create trigger reservations_hourly_bounds
  before insert or update of start_time, end_time on public.reservations
  for each row execute function public.enforce_hourly_bounds();

drop trigger if exists blocked_slots_hourly_bounds on public.blocked_slots;
create trigger blocked_slots_hourly_bounds
  before insert or update of start_time, end_time on public.blocked_slots
  for each row execute function public.enforce_hourly_bounds();
