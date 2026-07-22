-- Los valores enum se agregan en una migración separada porque PostgreSQL exige
-- confirmar la transacción antes de utilizar un valor nuevo.
alter type public.app_role add value if not exists 'platform_admin';
alter type public.app_role add value if not exists 'owner';
alter type public.app_role add value if not exists 'staff';
alter type public.app_role add value if not exists 'customer';
