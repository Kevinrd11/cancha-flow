# CanchaFlow — informe de hallazgos

Revisión completa del producto previa a mostrarlo a clientes.
Fecha: 18 de agosto de 2026. Rama `main`, sobre `683bc3a`.

## Resumen

La base técnica es sólida y está por encima del promedio para un producto de
este tamaño: la concurrencia de reservas se resuelve en PostgreSQL con una
constraint de exclusión GiST más `pg_advisory_xact_lock`, el aislamiento entre
centros se aplica con RLS además del filtro por `business_id` en cada consulta,
y la consistencia financiera se mantiene con triggers idempotentes.

Los problemas encontrados no están en esa base, sino en tres capas por encima:
comportamiento en operación real, cobertura de pruebas y funcionalidad de
producto.

| Severidad | Hallazgo | Estado |
|---|---|---|
| Alta | Las reservas pendientes nunca expiraban y bloqueaban el horario para siempre | Corregido |
| Alta | El login no tenía rate limiting pese a que el README afirmaba lo contrario | Corregido |
| Alta | La reserva pública no validaba horario comercial ni días cerrados | Corregido |
| Alta | La reserva pública, anónima, no tenía ningún límite de solicitudes | Corregido |
| Crítica | Ninguna migración otorgaba privilegios de tabla: una base creada desde cero deja el catálogo vacío y el panel inutilizable | Corregido |
| Crítica | `create_public_reservation` no estaba concedida a `service_role`, el rol con el que la llama el servidor: toda reserva fallaba con 503 | Corregido |
| Crítica | `service_role` no tenía privilegios de tabla: el registro de un centro fallaba en una base nueva | Corregido |
| Alta | `supabase/seed.sql` fallaba por `public_token_hash` NOT NULL, así que `db reset` nunca poblaba datos | Corregido |
| Alta | Los UUID del seed eran inválidos: toda acción del panel sobre datos de demostración devolvía 400 | Corregido |
| Alta | El panel solo administra una cancha | Corregido |
| Alta | No existe ningún canal de notificación | Pendiente |
| Media | 9 route handlers sin pruebas, incluido el de reserva pública | Corregido |
| Media | El seed fechaba los datos en UTC, así que el panel mostraba "hoy" vacío | Corregido |
| Media | Tras un choque de horario, la parrilla de disponibilidad no se recargaba | Corregido |
| Media | `typecheck` fallaba en CI por los tipos generados de Next 16 | Corregido |
| Media | El cliente no puede consultar ni cancelar su reserva | Pendiente |
| Media | `no_show` y `expired` no son alcanzables desde la interfaz | Pendiente |
| Baja | Precio único por hora, sin franjas ni fines de semana | Pendiente |
| Baja | Zona horaria de Costa Rica fija en SQL y en el código | Pendiente |
| Baja | Suscripción SaaS sin cobro ni límites de plan aplicados | Pendiente |
| Baja | Tablas y componentes muertos | Pendiente |

---

## Corregido en esta tanda

### 1. Las reservas pendientes nunca expiraban — severidad alta

`create_public_reservation` insertaba `status='pending'` con `expires_at = null`
(`supabase/migrations/20260722000200_pending_reservations_block_slots.sql:70`).
La constraint `reservations_no_active_overlap` cuenta `pending` como estado
activo, así que **una solicitud abandonada bloqueaba ese horario de forma
permanente**. `expire_stale_reservations()` se invocaba dentro de los RPC pero
no tenía nada que expirar, y el campo "tiempo de apartado" configurable en
`/admin/configuracion` no producía ningún efecto.

En una demo esto se nota rápido: bastan unas cuantas solicitudes de prueba
abandonadas para que la agenda quede sin horarios disponibles.

La migración `20260818000280_reservation_hardening.sql` restituye la expiración,
pero reinterpretando `hold_minutes` como *plazo para que el propietario
responda*: el rango pasa de 5–180 minutos a 1–72 horas, con 24 horas por
defecto. El rango anterior era la razón por la que se había desactivado la
expiración — un apartado de 20 minutos cancelaba solicitudes legítimas hechas de
noche. También se programa el trabajo de `pg_cron` que estaba comentado, para
que los horarios se liberen sin depender de que alguien visite la página.

### 2. El login no tenía rate limiting — severidad alta

`enforceAuthRateLimit` solo definía las acciones `register` y `recovery`
(`src/lib/auth/request-security.ts`). El handler de login calculaba la huella
para auditoría pero nunca consumía el límite, así que la única barrera contra
fuerza bruta eran los límites de plataforma de Supabase. El README línea 40
afirmaba que el login sí estaba protegido.

Ahora se aplican 10 intentos cada 15 minutos, contados por IP y por correo, de
modo que un atacante no evade el límite rotando cuentas ni puede bloquear a un
usuario concreto desde muchas direcciones. El límite corta antes de llegar a
Supabase Auth.

### 3. La reserva pública no validaba el horario comercial — severidad alta

`create_public_reservation` hacía join con `business_settings` pero solo leía
`business_id` y `hourly_rate`: no comprobaba `opening_time`, `closing_time` ni
`non_working_days`, y no acotaba la anticipación. La interfaz sí lo hacía, pero
**el RPC está concedido al rol `anon`**, así que se podía llamar directamente
con la clave publicable y crear una reserva a las 03:00 de un día cerrado, o con
años de anticipación.

Se añadieron las tres validaciones en el RPC, más una ventana máxima de 60 días.
`get_public_availability` tampoco comprobaba que el centro estuviera activo y
aprobado; ahora sí.

### 4. La reserva pública no tenía límite de solicitudes — severidad alta

`POST /api/reservations` es anónimo y no tenía rate limiting ni captcha:
cualquiera podía llenar la agenda de un centro con solicitudes falsas. Se agregó
un límite de 10 solicitudes por hora por IP.

### 5. La base de datos no era reproducible — severidad crítica

Estos tres se encontraron **levantando la base desde cero** con `supabase start`
y `supabase db reset`, no leyendo el código. Ninguno se nota mientras se trabaja
contra un proyecto que ya existe, y los tres impiden montar un entorno nuevo
—staging, pruebas E2E o el despliegue de un cliente nuevo—.

**a) Faltaban los privilegios de tabla.** Todas las tablas tienen su política
RLS, pero Postgres exige además el permiso de tabla *antes* de evaluar RLS, y
ninguna migración lo otorgaba. En una base nueva, `anon` no puede leer nada: el
catálogo de `/canchas` mostraba «0 canchas encontradas» y el panel del
propietario no podía consultar sus propias reservas. Lo corrige
`20260818000300_table_grants.sql`, con una lista explícita que espeja las
políticas: `auth_rate_limits` y `security_audit_events` quedan fuera a
propósito.

**b) `create_public_reservation` no estaba concedida a `service_role`.** El
endpoint público la llama con la clave de servicio, pero la función solo estaba
concedida a `anon` y `authenticated`. `service_role` evita RLS, no los permisos
de ejecución de funciones, así que **toda reserva fallaba con 503**. Se reprodujo
en el navegador antes de corregirlo.

**c) `service_role` tampoco tenía privilegios de tabla.** Solo los tenía sobre
las dos tablas que una migración anterior le concedió a mano. El route handler
de onboarding consulta `businesses`, `business_members` y `profiles`
directamente con la clave de servicio, así que **el registro de un centro
fallaba en cualquier base nueva**. Se le concede acceso completo al esquema
`public` —es la clave de servidor, nunca llega al navegador y ya evita RLS por
diseño— y se fijan privilegios por defecto para que las tablas futuras no
repitan el fallo.

**d) El seed nunca se aplicaba.** `supabase/seed.sql` no rellenaba
`public_token_hash`, que es NOT NULL desde `20260722000180`, así que
`supabase db reset` abortaba y no quedaba ningún dato de demostración. Además
fechaba las reservas con `current_date`, que en Postgres es UTC: con el desfase
horario los datos caían al día siguiente y el panel mostraba «hoy» vacío. Ambas
cosas están corregidas y ahora la agenda del día se llena sola.

**e) Los identificadores del seed no eran UUID válidos.** Clientes, reservas y
bloqueos usaban valores como `20000000-0000-0000-0000-000000000002`, sin los
dígitos de versión ni de variante que exige RFC 9562. Zod los rechaza, así que
**cualquier acción del panel sobre un dato de demostración devolvía 400**:
confirmar una reserva, registrar un cobro o quitar un bloqueo. Se detectó al
automatizar el recorrido del propietario. Ese es exactamente el paso que se
enseña en una demo.

### 6. Nueve route handlers sin pruebas — severidad media

Sin cobertura estaban `api/reservations` (el endpoint que sostiene el negocio),
`api/availability`, `admin/blocked-slots`, `admin/settings`, `admin/court/image`,
`admin/finance/[id]`, `admin/finance/export`, `auth/recovery` y
`auth/sessions/revoke-others`.

La suite pasó de 119 a 195 pruebas y la cobertura de sentencias de 49,75 % a
74,5 %. Los umbrales de `vitest.config.ts` se subieron en consecuencia para que
protejan de regresiones en vez de acompañarlas.

### 7. `typecheck` fallaba en CI — severidad media

El workflow ejecutaba `typecheck` antes de `build`, y `PageProps<"/ruta">` es un
tipo que Next 16 genera durante `dev`, `build` o `typegen`. Por eso los dos
archivos de página tenían tipos escritos a mano sin commitear, que perdían la
comprobación de la ruta literal. El script pasó a `next typegen && tsc --noEmit`
y los archivos volvieron a usar el helper de Next.

### 8. El panel solo administraba una cancha — severidad alta

El esquema era multi-cancha desde el principio (`fields.slug` único por negocio,
`business_settings` colgando de `field_id`, `/centro/[slug]?court=` ya resolvía
cuál), pero `src/lib/business-data.ts` hacía `.limit(1).single()` en las dos
consultas del panel: el propietario solo editaba la primera cancha y no existía
forma de crear otra. La mayoría de centros deportivos tienen varias, así que
esto cerraba la venta a ese perfil.

Ahora `getBusinessSettings()` y `getAdminCourt()` aceptan un `fieldId` opcional,
`getBusinessCourts()` alimenta un selector en `/admin/canchas`, y el alta pasa
por el RPC `create_business_court` (`20260818000290_multi_court.sql`), que en una
sola transacción crea la cancha **y** su fila de `business_settings` —una cancha
sin ella queda inservible—, genera un slug único dentro del negocio, hereda el
horario de la primera cancha y aplica el `max_courts` del plan contratado.

### 9. La disponibilidad no se recargaba tras un choque de horario — severidad media

Si dos personas pedían el mismo horario, la segunda recibía correctamente «Ese
horario acaba de ocuparse», pero la parrilla seguía mostrando ese bloque como
disponible y seleccionado: nunca se volvía a consultar `/api/availability` tras
el 409, así que el siguiente intento fallaba igual. El mensaje de error tampoco
se limpiaba al volver a elegir horario.

Ahora un 409 devuelve al paso de horario, limpia la selección y fuerza una nueva
consulta de disponibilidad. Verificado en el navegador ocupando el horario por
fuera mientras el visitante llenaba sus datos: al enviar, el bloque pasó de
«Disponible» a «Pendiente» en la misma pantalla
(`src/components/reservation/reservation-flow.tsx`).

### 10. Sin pruebas de punta a punta — severidad media

Las reglas que sostienen el negocio —solape de reservas, expiración de
solicitudes, aislamiento por RLS— viven en PostgreSQL, y las pruebas unitarias
las simulan con dobles. Nada comprobaba el recorrido real contra una base de
verdad; de hecho, tres de los fallos críticos de arriba solo salieron al montar
esa base.

Se añadió Playwright con cinco casos sobre Postgres real: la reserva pública de
punta a punta, el filtrado de horas ya pasadas, el acceso al panel, la
confirmación con cobro —comprobando que persiste tras recargar— y que el login
fallido no revela si la cuenta existe. La suite prepara sus propios datos en cada
corrida, así que se puede repetir sin resembrar la base, y corre en CI como un
job aparte para no alargar la señal rápida de lint y pruebas unitarias.

---

## Pendiente

### Ningún canal de notificación — severidad alta

No hay email, SMS, WhatsApp ni push. El propietario no se entera de una reserva
nueva salvo que abra el panel, y el cliente nunca sabe si se la confirmaron. Lo
único existente es un enlace `wa.me` que el propio cliente debe pulsar después
de reservar. La tabla `public.notifications` existe en el esquema y ningún
archivo la usa.

### El cliente no puede gestionar su reserva — severidad media

`create_public_reservation` genera un `public_token` y guarda su hash, pero la
API nunca lo devuelve y no existe ninguna ruta `/reserva/[código]`. El cliente
no puede consultar, cancelar ni reprogramar; toda cancelación pasa por el
propietario. La `cancellation_policy` configurable ni siquiera se muestra en la
ficha pública.

### Estados inalcanzables — severidad media

`no_show` y `expired` están en el enum y `src/lib/finance/reservation.ts` los
contempla, pero ninguna pantalla permite llegar a ellos. Un centro no puede
marcar que un cliente no se presentó.

### Precios y horarios rígidos — severidad baja

Existe una sola tarifa por hora por cancha. No hay prime time, fin de semana,
feriados, temporadas, descuentos, cupones, paquetes ni membresías. El campo
`subtotal` existe pero siempre se escribe igual que `total`. El horario es único
para los siete días: `non_working_days` es una lista suelta de fechas, no un
horario por día de la semana.

### Zona horaria fija — severidad baja

`America/Costa_Rica` está codificada en los RPC y en `src/lib/utils.ts`, aunque
`businesses.timezone` existe y el onboarding ofrece MXN, COP, GTQ y USD. Un
centro fuera de Costa Rica calcularía mal "hoy" y "ahora".

### Suscripción sin cobro — severidad baja

`plans` y `subscriptions` existen con precios y con `max_courts` / `max_staff`,
y el onboarding crea una prueba de 14 días, pero nadie cobra, no hay fin de
prueba, ni dunning, ni se aplican los límites del plan.

### Código y tablas muertas — severidad baja

Sin uso: tablas `venues`, `sports`, `expenses`, `notifications` y `payments`
(esta última quedó del flujo de comprobante SINPE eliminado en `bc3f29b`);
componentes `src/components/site-header.tsx`, `src/components/site-footer.tsx` y
`src/components/reservation/public-booking.tsx`. Los endpoints
`/api/auth/register` y `/api/auth/resend-confirmation` responden 410.

---

## Nota sobre despliegue

`docs/auth-production.md` exige activar "Confirm Email" en Supabase, pero el
onboarding crea los usuarios con `email_confirm: true` (commit `8a3cb95`,
"activar cuentas sin confirmación por correo"). Conviene decidir cuál de las dos
es la política real antes de publicar, porque el login exige
`email_confirmed_at` para dejar entrar.
