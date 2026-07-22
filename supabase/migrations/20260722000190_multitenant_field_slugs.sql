-- Cada negocio puede usar slugs naturales como "principal" sin chocar con otros tenants.
alter table public.fields drop constraint if exists fields_slug_key;
drop index if exists public.fields_slug_key;
create unique index if not exists fields_business_slug_key on public.fields (business_id, slug);
