-- La migración de endurecimiento dejó business_settings legible solo para
-- authenticated, así que la ficha pública perdía el horario configurado por el
-- propietario y caía siempre al 08:00-22:00 por defecto.
--
-- En lugar de reabrir la tabla a anon, se expone únicamente el subconjunto de
-- columnas que la página pública necesita, con el mismo patrón security definer
-- que ya usa get_public_availability. Quedan fuera sinpe_phone, hold_minutes,
-- cancellation_policy y non_working_days.
create or replace function public.get_public_field_settings(p_field_ids uuid[])
returns table (
  field_id uuid,
  opening_time time,
  closing_time time,
  slot_interval_minutes integer,
  minimum_reservation_minutes integer,
  whatsapp_phone text
)
language sql
stable
security definer
set search_path = ''
as $$
  select s.field_id, s.opening_time, s.closing_time, s.slot_interval_minutes,
         s.minimum_reservation_minutes, s.whatsapp_phone
  from public.business_settings s
  join public.fields f on f.id = s.field_id
  join public.businesses b on b.id = f.business_id
  where s.field_id = any(p_field_ids)
    and f.active
    and b.active
    and b.subscription_status not in ('canceled', 'suspended');
$$;

revoke all on function public.get_public_field_settings(uuid[]) from public;
grant execute on function public.get_public_field_settings(uuid[]) to anon, authenticated;
