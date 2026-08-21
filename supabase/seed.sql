insert into public.fields (id, business_id, name, slug, sport, description, location, hourly_rate, capacity)
values (
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000010',
  'Arena Ciudad Quesada',
  'principal',
  'Fútbol 5',
  'Cancha sintética techada para fútbol 5.',
  'Barrio El Carmen, Ciudad Quesada, San Carlos',
  18000,
  14
) on conflict (id) do update set name = excluded.name;

insert into public.business_settings (
  business_id, field_id, whatsapp_phone, sinpe_phone, opening_time, closing_time,
  minimum_reservation_minutes, slot_interval_minutes, hold_minutes,
  cancellation_policy, non_working_days
) values (
  '00000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000000001',
  '50688881212', '88881212', '08:00', '23:00', 60, 60, 1440,
  'Puedes reprogramar sin costo con al menos 24 horas de anticipación.',
  '[]'::jsonb
) on conflict (field_id) do nothing;

insert into public.customers (id, business_id, full_name, phone, email) values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000010', 'Daniela Vargas', '88881020', 'daniela@example.com'),
  ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000010', 'Andrés Rojas', '87014432', null),
  ('10000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000010', 'Sofía Jiménez', '61129090', 'sofia@example.com')
on conflict (business_id, phone) do nothing;

-- Los estados reflejan lo que produce el flujo actual: una solicitud sin
-- responder nace 'pending'. 'awaiting_approval' quedó de una versión anterior y
-- ninguna pantalla sabe confirmarlo.
-- public_token_hash es NOT NULL desde 20260722000180: sin él, el seed falla y
-- `supabase db reset` no llega a poblar nada.
insert into public.reservations (
  id, business_id, reservation_code, public_token_hash, field_id, customer_id,
  reservation_date, start_time, end_time,
  status, payment_status, subtotal, total, source, expires_at
) values
  ('20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000010', 'LD-7F2A9C', encode(extensions.digest('20000000-0000-4000-8000-000000000001', 'sha256'), 'hex'), '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', (now() at time zone 'America/Costa_Rica')::date, '18:00', '19:00', 'confirmed', 'approved', 18000, 18000, 'website', null),
  ('20000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000010', 'LD-3M8K1Q', encode(extensions.digest('20000000-0000-4000-8000-000000000002', 'sha256'), 'hex'), '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', (now() at time zone 'America/Costa_Rica')::date, '20:00', '22:00', 'pending', 'unpaid', 36000, 36000, 'whatsapp', now() + interval '20 minutes'),
  ('20000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000010', 'LD-9P4R2X', encode(extensions.digest('20000000-0000-4000-8000-000000000003', 'sha256'), 'hex'), '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003', ((now() at time zone 'America/Costa_Rica')::date + 1), '19:00', '20:00', 'confirmed', 'approved', 18000, 18000, 'phone', null)
on conflict (id) do nothing;

insert into public.blocked_slots (id, business_id, field_id, blocked_date, start_time, end_time, reason)
values ('30000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000001', (now() at time zone 'America/Costa_Rica')::date, '16:00', '17:00', 'Mantenimiento del césped')
on conflict (id) do nothing;

-- El onboarding crea el perfil propietario y business_members de forma transaccional.
