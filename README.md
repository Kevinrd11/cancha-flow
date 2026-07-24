# CanchaFlow San Carlos

MVP local para encontrar y reservar canchas de fútbol en Ciudad Quesada, San Carlos, Costa Rica. Construido con Next.js 16 App Router, React 19, TypeScript estricto, Tailwind CSS 4, Supabase/PostgreSQL y Zod.

## Recorridos principales

1. Un jugador busca por fecha, hora, sector, precio o modalidad, abre `/canchas/[slug]` y solicita una reserva sin crear una cuenta.
2. El propietario ingresa en `/admin/login`, consulta las solicitudes y confirma o cancela una reserva.
3. El propietario bloquea un horario desde el calendario y ese espacio deja de mostrarse como disponible públicamente.

## Áreas del MVP

- `/` — portada local con búsqueda, canchas destacadas, disponibilidad, sectores y sección para propietarios.
- `/canchas` — explorador con los filtros esenciales.
- `/canchas/[slug]` — galería, información, servicios, reglas, contacto, mapa y reserva.
- `/registro` — presentación del servicio y registro guiado de una cancha.
- `/registro` y `/admin/login` — alta y acceso exclusivo para propietarios de canchas.
- Los jugadores reservan desde `/canchas` sin crear una cuenta.
- `/recuperar-contrasena` — recuperación con respuesta no enumerable.
- `/admin` — resumen privado del propietario.
- `/admin/reservas` — lista y gestión de solicitudes.
- `/admin/calendario` — agenda, reservas manuales y bloqueos.
- `/admin/horarios` — horario regular y acceso a bloqueos.
- `/admin/canchas` — información, fotografía, precio y estado de la cancha.
- `/admin/configuracion` — contacto, apertura y reglas de reserva.

Los antiguos módulos de gastos, reportes, equipo, superadministración e ingresos no forman parte de la navegación del MVP y redirigen a las áreas esenciales.

## Datos y seguridad

El modo administrativo de demostración solo se habilita explícitamente con `CANCHAFLOW_DEMO_MODE=true` y nunca funciona bajo `NODE_ENV=production`. Reservas y bloqueos demo viven en memoria durante la ejecución local.

Con Supabase configurado:

- `business_id` aísla cada propietario y su cancha;
- Proxy protege las rutas del panel;
- cada Route Handler vuelve a validar sesión y pertenencia;
- RLS aplica el aislamiento en PostgreSQL;
- las sesiones se almacenan en cookies `HttpOnly`, `SameSite=Lax` y `Secure` en producción;
- registro, login y recuperación tienen rate limiting distribuido;
- los cambios de contraseña revocan las sesiones anteriores;
- las funciones transaccionales usan bloqueo por cancha y fecha;
- las restricciones de exclusión impiden reservas activas superpuestas;
- una solicitud pública nace en estado `pending` y no exige pago en línea.

La interfaz mensual/anual no procesa pagos ni almacena tarjetas. Ese punto queda preparado para una integración posterior.

## Desarrollo local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Variables requeridas para autenticación en producción:

| Variable | Uso |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Sesiones y consultas con RLS; también acepta la clave heredada `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `SUPABASE_SECRET_KEY` | Onboarding, rate limiting, auditoría y Auth administrativo; también acepta `SUPABASE_SERVICE_ROLE_KEY` |
| `NEXT_PUBLIC_APP_URL` | URL canónica de la aplicación |
| `AUTH_RATE_LIMIT_PEPPER` | Seudonimización HMAC de identificadores de rate limit |
| `CANCHAFLOW_DEMO_MODE` | Modo demo explícito, solo desarrollo |

Revise [el checklist de autenticación en producción](docs/auth-production.md) antes de desplegar.

## Base de datos

Ejecute las migraciones en orden:

```text
supabase/migrations/20260721000100_initial_schema.sql
supabase/migrations/20260721000150_multitenant_roles.sql
supabase/migrations/20260721000160_canchaflow_multitenant.sql
supabase/migrations/20260721000170_local_football_mvp.sql
supabase/migrations/20260722000180_auth_hardening.sql
supabase/migrations/20260722000190_multitenant_field_slugs.sql
supabase/migrations/20260722000200_pending_reservations_block_slots.sql
```

`supabase/seed.sql` contiene datos de demostración y debe usarse únicamente en desarrollo local, nunca en producción.

## Verificación

```bash
npm run lint
npm run typecheck
npm test
npm run build
```
