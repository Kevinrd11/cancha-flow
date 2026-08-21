-- Privilegios de tabla para los roles de la API.
--
-- Todas las tablas tienen su política RLS, pero ninguna migración otorgaba el
-- permiso de tabla que Postgres exige *antes* de evaluar RLS. En un proyecto
-- creado desde cero con estas migraciones, `anon` no puede leer nada: el
-- catálogo público de /canchas sale vacío y el panel del propietario no puede
-- consultar sus propias reservas. Se detectó levantando la base local con
-- `supabase db reset`, donde los privilegios por defecto de Supabase no
-- alcanzan a las tablas creadas por las migraciones.
--
-- RLS sigue siendo la barrera que decide *qué filas* ve cada quien; esto solo
-- abre la puerta de la tabla. Por eso la lista es explícita y espeja las
-- políticas existentes, en vez de un `grant all on all tables`:
-- auth_rate_limits y security_audit_events quedan fuera a propósito.

grant usage on schema public to anon, authenticated;

-- Lectura pública: lo que necesita el catálogo y la ficha de cada centro.
-- Las políticas ya limitan a negocios activos y aprobados.
grant select on table public.businesses to anon;
grant select on table public.fields to anon;
grant select on table public.plans to anon;
grant select on table public.sports to anon;
grant select on table public.venues to anon;

-- Solo lectura para el usuario autenticado.
grant select on table public.audit_logs to authenticated;
grant select on table public.notifications to authenticated;
grant select on table public.plans to authenticated;
grant select on table public.sports to authenticated;
grant select, update on table public.businesses to authenticated;

-- Tablas que el panel administra. La política correspondiente es `for all`,
-- así que el permiso de tabla acompaña las cuatro operaciones.
grant select, insert, update, delete on table public.blocked_slots to authenticated;
grant select, insert, update, delete on table public.business_members to authenticated;
grant select, insert, update, delete on table public.business_settings to authenticated;
grant select, insert, update, delete on table public.customers to authenticated;
grant select, insert, update, delete on table public.expenses to authenticated;
grant select, insert, update, delete on table public.fields to authenticated;
grant select, insert, update, delete on table public.financial_transactions to authenticated;
grant select, insert, update, delete on table public.payments to authenticated;
grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.reservations to authenticated;
grant select, insert, update, delete on table public.subscriptions to authenticated;
grant select, insert, update, delete on table public.venues to authenticated;

-- Se reafirma que las dos tablas sensibles siguen siendo exclusivas del
-- servidor, por si un `grant` futuro las alcanzara por descuido.
revoke all on table public.auth_rate_limits from anon, authenticated;
revoke all on table public.security_audit_events from anon;
grant select on table public.security_audit_events to authenticated;

-- El endpoint público de reservas llama a create_public_reservation con la
-- clave de servicio, pero la función solo estaba concedida a anon y
-- authenticated: en una base creada desde cero, toda reserva fallaba con 503.
-- service_role evita RLS, no los permisos de ejecución de funciones.
grant execute on function public.create_public_reservation(uuid,date,time,time,text,text,text) to service_role;

-- `service_role` es la clave de servidor: nunca llega al navegador y ya evita
-- RLS por diseño, así que restringirla por tabla no aporta seguridad, solo
-- rompe cosas en silencio. Solo tenía privilegios sobre las dos tablas que una
-- migración anterior le concedió a mano, de modo que en una base nueva el
-- registro de un centro fallaba al consultar `businesses`, `business_members`
-- y `profiles` desde el route handler de onboarding.
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all functions in schema public to service_role;

-- Las tablas que se creen más adelante heredan lo mismo, para no repetir este
-- fallo en la próxima migración que agregue una.
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant all on functions to service_role;
