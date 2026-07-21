# La Doce — administración y reservas de cancha

Primera versión funcional, mobile-first, para consultar disponibilidad, reservar una cancha, pagar por SINPE y administrar la operación diaria. Está construida con Next.js App Router, TypeScript, Tailwind CSS 4, Supabase, PostgreSQL y Zod.

La interfaz puede ejecutarse sin credenciales en **modo demo**. Al configurar Supabase, las reservas, bloqueos, pagos y ajustes se persisten con Row Level Security.

## Funcionalidades incluidas

### Sitio público

- Inicio deportivo y responsive con fotografías reales de Unsplash, información, precio, horario, normas, ubicación y accesos a WhatsApp.
- Selector de los próximos días, horarios en intervalos de 30 minutos y duraciones de 1, 1.5 o 2 horas.
- Exclusión de horarios pasados y cálculo automático del precio.
- Flujo de datos del cliente, resumen, instrucciones SINPE y confirmación.
- Comprobantes JPG, PNG o WebP de hasta 5 MB, validados por MIME, tamaño y firma binaria.
- Estados públicos sin información privada: disponible, pendiente, reservado y bloqueado.
- Número de reserva y resumen listo para WhatsApp.

### Administración (`/admin`)

- Autenticación con Supabase Auth y verificación adicional del perfil `admin`.
- Dashboard con reservas del día, pendientes, próxima reserva, horas libres, ingresos y resumen semanal.
- Calendario diario, semanal y mensual.
- Alta manual para WhatsApp, llamada, presencial o administración.
- Detalle, reprogramación, cancelación con confirmación y bloqueos por mantenimiento/eventos.
- Búsqueda por nombre, teléfono o código; filtros por fecha y estado.
- Aprobación/rechazo de pagos, estados operativos y notas internas.
- Configuración de nombre, teléfonos, tarifa, horario, duración mínima, tiempo de apartado, política y días no laborables.

## Arquitectura

```text
src/
├── app/
│   ├── api/                    # Route Handlers públicos y administrativos
│   ├── admin/                  # Dashboard protegido
│   ├── reservar/               # Flujo público de reserva
│   └── page.tsx                # Inicio
├── components/
│   ├── admin/                  # Calendario, reservas, ajustes y shell
│   ├── reservation/            # Flujo público por etapas
│   └── ui/                     # Primitivas reutilizables
├── lib/
│   ├── supabase/               # Clientes browser/server/service-role
│   ├── admin-auth.ts           # Autorización por operación
│   ├── admin-data.ts           # Capa de lectura con fallback demo
│   ├── validation.ts           # Esquemas Zod compartidos
│   └── overlap.ts              # Lógica pura de intervalos
└── proxy.ts                    # Renovación de sesión y protección /admin
supabase/
├── migrations/                 # Esquema, funciones, RLS y Storage
└── seed.sql                    # Datos de ejemplo
```

Los componentes no reciben la clave privada. Las operaciones públicas sensibles viven en Route Handlers o funciones PostgreSQL; las administrativas validan autenticación y rol en cada solicitud.

## Prevención de reservas duplicadas

La protección funciona en varias capas:

1. La interfaz solo ofrece inicios cuyos segmentos consecutivos están libres.
2. El servidor vuelve a validar fecha, datos y disponibilidad.
3. `create_public_reservation` obtiene un `pg_advisory_xact_lock` por cancha y fecha, y verifica bloqueos dentro de la misma transacción.
4. La restricción de exclusión GiST `reservations_no_active_overlap` impide intersecciones incluso si dos transacciones concurrentes alcanzan el `INSERT`.
5. Los rangos son `[inicio, fin)`, por lo que 18:00–19:00 y 19:00–20:00 sí pueden coexistir.

Los bloqueos administrativos usan el mismo candado mediante `create_blocked_slot` y se niegan si contienen una reserva activa.

## Requisitos

- Node.js 20.9 o superior (recomendado: Node 22 LTS).
- npm 10 o superior.
- Un proyecto de Supabase para persistencia real.

## Instalación local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abre `http://localhost:3000`. Si las variables de Supabase están vacías, el sitio usa datos demo y permite recorrer `/admin` sin iniciar sesión.

## Configurar Supabase

1. Crea un proyecto nuevo en Supabase.
2. Abre **SQL Editor** y ejecuta, en orden:
   - `supabase/migrations/202607210001_initial_schema.sql`
   - `supabase/seed.sql`
3. Copia Project URL, anon/publishable key y service role key en `.env.local`.
4. En **Authentication → Users**, crea el usuario propietario.
5. Copia su UUID y ejecuta:

```sql
insert into public.profiles (id, full_name, role)
values ('UUID-DEL-USUARIO', 'Administrador La Doce', 'admin');
```

6. Verifica que **Storage → payment-proofs** figure como bucket privado. La migración lo crea y solo permite lectura autenticada a administradores.
7. Para vencer apartados aunque nadie consulte la disponibilidad, programa en **Integrations → Cron** cada 5 minutos:

```sql
select public.expire_stale_reservations();
```

La misma función se ejecuta automáticamente antes de cada consulta pública. Solo vencen reservas `pending` o `awaiting_payment`; una reserva con comprobante pasa a `awaiting_approval` y deja de liberarse automáticamente.

## Variables de entorno

| Variable | Exposición | Uso |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Pública | URL del proyecto |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Pública | Sesiones y consultas protegidas por RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo servidor | Subir comprobantes públicos y asociarlos a una reserva |
| `NEXT_PUBLIC_APP_URL` | Pública | URL canónica de la aplicación |

Nunca uses `SUPABASE_SERVICE_ROLE_KEY` en un componente cliente ni la prefijes con `NEXT_PUBLIC_`.

## Comandos de verificación

```bash
npm run lint
npm test
npm run test:coverage
npm run build
```

Las pruebas de `src/lib/overlap.test.ts` cubren intersección parcial, contención, horarios adyacentes, intervalos inválidos y disponibilidad entre reservas. La base de datos añade la garantía concurrente real mediante la exclusión GiST.

## Despliegue en Vercel

1. Sube el repositorio a GitHub, GitLab o Bitbucket.
2. En Vercel selecciona **Add New → Project** e importa el repositorio.
3. Framework Preset: **Next.js**. No requiere cambiar Build Command (`npm run build`).
4. Agrega las cuatro variables de `.env.example` en Project Settings → Environment Variables. Usa la URL final de Vercel en `NEXT_PUBLIC_APP_URL`.
5. Despliega.
6. En Supabase → Authentication → URL Configuration agrega la URL de producción y, si usas previews, el patrón permitido correspondiente.

Después del despliegue verifica `/`, `/reservar`, `/admin/login` y una carga de comprobante de prueba. Los archivos permanecen privados y deben consultarse con una URL firmada desde una sesión administrativa.

## Seguridad implementada

- RLS habilitado en todas las tablas del dominio.
- Los clientes nunca pueden listar reservas, clientes, pagos ni auditorías.
- El estado público se obtiene mediante una función que solo devuelve hora y estado.
- Autorización dentro del proxy **y** de cada Route Handler administrativo.
- Bucket privado con políticas específicas para administradores.
- Zod en los límites públicos y administrativos; sanitización adicional de texto.
- Restricción de 5 MB y lista cerrada de formatos de imagen.
- Auditoría automática de reservas, pagos, bloqueos y configuración.
- Claves privadas limitadas al servidor.

## Personalización antes de producción

- Sustituye teléfonos, dirección, tarifa y nombre desde Configuración y alinea los valores iniciales de `src/lib/constants.ts` con el registro real.
- Reemplaza las fotografías de demostración por fotografías propias de la cancha; mantén textos alternativos descriptivos.
- Configura correo o WhatsApp transaccional si deseas notificaciones automáticas tras aprobar un pago.
- Define un proceso de respaldo y retención de comprobantes según las políticas del negocio.

## Fotografías

La portada usa imágenes remotas de Unsplash como contenido real de demostración. Antes de publicar, se recomienda cargar fotografías propias y optimizadas de la cancha para representar fielmente el negocio.
