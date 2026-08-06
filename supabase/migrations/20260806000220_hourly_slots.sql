-- Reservas de hora en hora.
--
-- El negocio no alquila medias horas: se aparta de 1 a 2, de 2 a 3, y así
-- sucesivamente, por una o dos horas. Esta migración deja la base de datos como
-- única fuente de verdad de esa regla: los horarios públicos se generan cada 60
-- minutos y ni las reservas ni los bloqueos pueden caer fuera de la hora.

alter table public.business_settings
  drop constraint if exists business_settings_slot_interval_minutes_check,
  drop constraint if exists business_settings_minimum_reservation_minutes_check;

alter table public.fields
  drop constraint if exists fields_reservation_minutes_check;

-- Normaliza lo que ya existe antes de exigir la regla nueva. Una apertura o un
-- cierre a media hora se recorta a la hora en punto porque esa media hora nunca
-- podría reservarse; el cierre nunca queda antes de la apertura.
-- La apertura se limita a las 22:00 para que sumarle una hora nunca dé la vuelta
-- al día y deje el cierre antes de la apertura.
update public.business_settings set
  slot_interval_minutes = 60,
  minimum_reservation_minutes = case when minimum_reservation_minutes > 60 then 120 else 60 end,
  opening_time = least(make_time(extract(hour from opening_time)::int, 0, 0), time '22:00'),
  closing_time = greatest(
    make_time(extract(hour from closing_time)::int, 0, 0),
    least(make_time(extract(hour from opening_time)::int, 0, 0), time '22:00') + interval '1 hour'
  );

update public.fields set
  reservation_minutes = case when reservation_minutes > 60 then 120 else 60 end;

alter table public.business_settings
  alter column slot_interval_minutes set default 60,
  add constraint business_settings_hourly_interval
    check (slot_interval_minutes = 60),
  add constraint business_settings_hourly_duration
    check (minimum_reservation_minutes in (60, 120)),
  add constraint business_settings_hourly_opening
    check (extract(minute from opening_time) = 0 and extract(second from opening_time) = 0),
  add constraint business_settings_hourly_closing
    check (extract(minute from closing_time) = 0 and extract(second from closing_time) = 0);

alter table public.fields
  add constraint fields_hourly_reservation
    check (reservation_minutes in (60, 120));

-- Las reservas y bloqueos históricos se conservan tal cual (not valid): la regla
-- solo aplica de aquí en adelante.
alter table public.reservations
  add constraint reservations_hourly_bounds check (
    extract(minute from start_time) = 0 and extract(second from start_time) = 0
    and extract(minute from end_time) = 0 and extract(second from end_time) = 0
  ) not valid;

alter table public.blocked_slots
  add constraint blocked_slots_hourly_bounds check (
    extract(minute from start_time) = 0 and extract(second from start_time) = 0
    and extract(minute from end_time) = 0 and extract(second from end_time) = 0
  ) not valid;
