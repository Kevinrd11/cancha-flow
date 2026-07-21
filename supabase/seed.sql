insert into public.fields (id, name, slug, description, location, hourly_rate, capacity)
values (
  '00000000-0000-4000-8000-000000000001',
  'La Doce',
  'la-doce',
  'Cancha sintética iluminada para fútbol 5 y 7.',
  'San Rafael, Alajuela · 200 m norte de la iglesia',
  18000,
  14
) on conflict (id) do update set name = excluded.name;

insert into public.business_settings (
  field_id, whatsapp_phone, sinpe_phone, opening_time, closing_time,
  minimum_reservation_minutes, slot_interval_minutes, hold_minutes,
  cancellation_policy, non_working_days
) values (
  '00000000-0000-4000-8000-000000000001',
  '50688881212', '88881212', '08:00', '23:00', 60, 30, 20,
  'Puedes reprogramar sin costo con al menos 24 horas de anticipación.',
  '[]'::jsonb
) on conflict (field_id) do nothing;

insert into public.customers (id, full_name, phone, email) values
  ('10000000-0000-0000-0000-000000000001', 'Daniela Vargas', '88881020', 'daniela@example.com'),
  ('10000000-0000-0000-0000-000000000002', 'Andrés Rojas', '87014432', null),
  ('10000000-0000-0000-0000-000000000003', 'Sofía Jiménez', '61129090', 'sofia@example.com')
on conflict (phone) do nothing;

insert into public.reservations (
  id, reservation_code, field_id, customer_id, reservation_date, start_time, end_time,
  status, payment_status, subtotal, total, source, expires_at
) values
  ('20000000-0000-0000-0000-000000000001', 'LD-7F2A9C', '00000000-0000-4000-8000-000000000001', '10000000-0000-0000-0000-000000000001', current_date, '18:00', '19:00', 'confirmed', 'approved', 18000, 18000, 'website', null),
  ('20000000-0000-0000-0000-000000000002', 'LD-3M8K1Q', '00000000-0000-4000-8000-000000000001', '10000000-0000-0000-0000-000000000002', current_date, '20:00', '21:30', 'awaiting_approval', 'pending', 27000, 27000, 'whatsapp', now() + interval '20 minutes'),
  ('20000000-0000-0000-0000-000000000003', 'LD-9P4R2X', '00000000-0000-4000-8000-000000000001', '10000000-0000-0000-0000-000000000003', current_date + 1, '19:00', '20:00', 'confirmed', 'approved', 18000, 18000, 'phone', null)
on conflict (id) do nothing;

insert into public.blocked_slots (id, field_id, blocked_date, start_time, end_time, reason)
values ('30000000-0000-0000-0000-000000000001', '00000000-0000-4000-8000-000000000001', current_date, '16:00', '17:00', 'Mantenimiento del césped')
on conflict (id) do nothing;

-- Después de crear un usuario en Authentication > Users, conviértelo en administrador:
-- insert into public.profiles (id, full_name, role)
-- values ('UUID-DEL-USUARIO', 'Nombre del administrador', 'admin');
