# Autenticación en producción

El proyecto usa Supabase Auth con email/contraseña, flujo PKCE y cookies administradas únicamente por el servidor. Supabase almacena contraseñas con bcrypt; la aplicación nunca recibe ni persiste el hash.

## Configuración obligatoria de Supabase

En **Authentication** configure lo siguiente antes de habilitar registros:

1. Active Email/Password y **Confirm Email**. El código rechaza nuevos registros si Supabase devuelve una sesión antes de verificar el correo.
2. En **URL Configuration**, establezca el dominio de producción como Site URL y agregue exactamente:
   - `https://SU-DOMINIO/auth/callback`
   - `https://SU-DOMINIO/auth/callback?next=/restablecer-contrasena`
   Agregue las variantes de localhost únicamente al proyecto de desarrollo.
3. Configure SMTP propio. El SMTP incluido por Supabase no es apto para entrega general en producción. Desactive el tracking que reescribe enlaces en el proveedor de correo.
4. Mantenga las plantillas de confirmación y recuperación usando la URL de confirmación/redirect de Supabase. Pruebe ambos correos después de cambiar una plantilla.
5. En Password Security, exija al menos 12 caracteres, mayúscula, minúscula, número y símbolo. En planes que lo permitan, active protección contra contraseñas filtradas.
6. Configure el vencimiento del access JWT en 15 minutos (nunca menos de 5). Mantenga rotación de refresh tokens y detección de reutilización activas; conserve el intervalo recomendado de reutilización de 10 segundos.
7. Evalúe sesiones time-boxed e inactivity timeout según la política comercial. La aplicación permite cerrar las demás sesiones y revoca todas tras cambiar/restablecer contraseña.
8. Active las notificaciones de seguridad por cambio de contraseña y revise periódicamente los Audit Logs de Supabase y `public.security_audit_events`.

Referencias oficiales: [sesiones](https://supabase.com/docs/guides/auth/sessions), [seguridad de contraseñas](https://supabase.com/docs/guides/auth/password-security), [URLs de redirección](https://supabase.com/docs/guides/auth/redirect-urls), [SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

## Variables

- `NEXT_PUBLIC_SUPABASE_URL`: URL pública del proyecto.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: clave pública `sb_publishable_...`; RLS sigue siendo obligatorio. Por compatibilidad también se acepta `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `SUPABASE_SECRET_KEY`: clave privada `sb_secret_...`, solo servidor. Por compatibilidad también se acepta `SUPABASE_SERVICE_ROLE_KEY`.
- `NEXT_PUBLIC_APP_URL`: origen canónico exacto usado para enlaces de correo y aceptado por la protección CSRF. Las solicitudes que llegan por un alias válido del despliegue también deben ser del mismo origen que la URL solicitada.
- `AUTH_RATE_LIMIT_PEPPER`: secreto aleatorio independiente, de al menos 32 bytes, para seudonimizar IP/correo.
- `CANCHAFLOW_DEMO_MODE`: solo desarrollo; producción siempre lo ignora.

No registre los valores reales y rote de inmediato cualquier clave que haya sido expuesta.

## Límites conocidos

- Supabase no expone mediante su API de cliente una lista completa y segura de dispositivos. La interfaz ofrece “Cerrar otras sesiones”. Para inventario detallado habría que añadir un registro de dispositivos y controles de privacidad.
- Un access JWT ya emitido puede seguir siendo válido hasta su vencimiento aunque se revoque el refresh token. Por eso se recomienda el vencimiento de 15 minutos y `getUser()` en cada operación sensible.
- El rate limiting de la aplicación complementa, no reemplaza, límites de plataforma, WAF/CDN y CAPTCHA ante abuso distribuido.
- La migración y las políticas RLS deben probarse contra un proyecto Supabase de staging; las pruebas unitarias no sustituyen una prueba real de PostgreSQL/Auth/SMTP.
