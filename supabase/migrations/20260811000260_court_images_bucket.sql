-- Fotografías de cancha subidas desde el dispositivo.
--
-- Hasta ahora la única forma de ilustrar una cancha era pegar un enlace de
-- Unsplash o Pexels, lo que obligaba al dueño a publicar su foto en otro sitio
-- primero. Este bucket guarda la imagen en el propio proyecto.
--
-- Es público en lectura a propósito: la foto se muestra en la página de la
-- cancha, que ve cualquier jugador sin sesión, y next/image necesita poder
-- descargarla sin firmar la URL. La escritura sí queda restringida al dueño.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('court-images', 'court-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- La ruta del archivo es {business_id}/{archivo}. Se comprueba en una función
-- aparte porque un nombre que no empiece por un uuid haría fallar el cast dentro
-- de la política y bloquearía consultas ajenas a este bucket.
create or replace function public.owns_court_image(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_business_id uuid;
begin
  begin
    v_business_id := (storage.foldername(p_name))[1]::uuid;
  exception when others then
    return false;
  end;
  return public.is_business_owner(v_business_id);
end;
$$;

revoke all on function public.owns_court_image(text) from public, anon;
grant execute on function public.owns_court_image(text) to authenticated;

drop policy if exists "court_images_public_read" on storage.objects;
create policy "court_images_public_read" on storage.objects for select
  to anon, authenticated using (bucket_id = 'court-images');

drop policy if exists "court_images_owner_write" on storage.objects;
create policy "court_images_owner_write" on storage.objects for all
  to authenticated
  using (bucket_id = 'court-images' and public.owns_court_image(name))
  with check (bucket_id = 'court-images' and public.owns_court_image(name));
