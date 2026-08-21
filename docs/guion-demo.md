# Guion de demostración — CanchaFlow

Recorrido de unos 12 minutos. Todo lo que aparece aquí se probó contra una base
local levantada desde cero.

## Antes de empezar

```bash
supabase start -x studio          # Studio necesita permisos de Docker Desktop
supabase db reset                 # aplica migraciones y datos de demostración
npm run dev
```

El seed deja **Arena Ciudad Quesada** con una cancha, tres clientes, un bloqueo
de mantenimiento a las 4 p. m. y tres reservas del día en distintos estados. Las
fechas se calculan en la zona de Costa Rica, así que la agenda de "hoy" siempre
aparece llena.

Falta crear el propietario, porque normalmente lo genera el registro:

```bash
# Cree el usuario en Supabase Auth (Authentication → Add user, con "Auto Confirm")
# y luego enlácelo al centro deportivo:
psql "$DB_URL" <<'SQL'
update public.profiles set role='owner', active=true
where id=(select id from auth.users where email='SU-CORREO');
insert into public.business_members (business_id, user_id, role, active)
select '00000000-0000-4000-8000-000000000010', id, 'owner', true
from auth.users where email='SU-CORREO'
on conflict (business_id, user_id) do update set active=true, role='owner';
SQL
```

Tenga dos pestañas abiertas: una como jugador y otra como propietario.

Si prefiere comprobar que todo responde antes de la reunión, `npm run e2e`
recorre solo la reserva pública y la confirmación con cobro.

---

## 1. El jugador encuentra la cancha (2 min)

Abra `/canchas`. Muestre los filtros por fecha, hora, precio y modalidad.

> «El jugador no necesita cuenta. Busca, compara y reserva.»

Entre a **Arena Ciudad Quesada**. Señale la galería, los servicios, las reglas y
el precio por hora.

## 2. Reserva sin crear cuenta (3 min)

Pulse **Ver horarios**. En la parrilla se ve el estado real de cada hora:
disponible, pendiente de confirmar, reservado y bloqueado por mantenimiento.

> «Esto sale de la base de datos en el momento, no es un calendario estático.»

Elija una hora libre, luego nombre y teléfono, y envíe. Aparece el número de
solicitud (`CF-…`).

> «La solicitud no cobra nada en línea y el horario ya queda apartado para que
> nadie más lo tome.»

**Momento fuerte —** si quiere enseñar la protección contra doble reserva, tenga
un ayudante que aparte esa misma hora desde otro dispositivo justo antes de que
usted envíe. La aplicación responde «Ese horario acaba de ocuparse», devuelve al
paso anterior y refresca la parrilla mostrando el bloque ya tomado.

## 3. El propietario responde (3 min)

Pase a la otra pestaña, en `/admin`. El resumen ya muestra la solicitud recién
creada en «Solicitudes pendientes».

Vaya a **Reservas**, abra la solicitud y pulse **Confirmar reserva**. Registre el
cobro con **Cobrada por completo** y el método de pago.

> «La plataforma no procesa pagos: el dinero se recibe fuera del sistema y aquí
> solo se registra. Eso alimenta el módulo de finanzas.»

## 4. El dinero (2 min)

Entre a **Finanzas**. Muestre ingresos cobrados, pendientes, ganancia neta,
ticket promedio y el mejor día de la semana. Pulse **Exportar CSV**.

> «Solo el propietario ve esta pantalla; un colaborador no puede entrar.»

## 5. Varias canchas (2 min)

En **Mi cancha**, pulse **Agregar otra cancha**. Complete nombre y precio.

> «La cancha nueva hereda el horario y la política de la primera, y aparece
> publicada de inmediato con su propia agenda.»

Vuelva a `/canchas` y muestre que ahora se listan dos.

---

## Preguntas que van a hacer

**¿Cobra en línea?** Todavía no. Hoy la reserva se confirma y el pago se
registra manualmente. La integración de pasarela está prevista y el esquema ya
tiene los campos.

**¿Le avisa al cliente?** Es lo siguiente en la lista. Hoy la coordinación se
hace por WhatsApp desde la misma pantalla de confirmación.

**¿Y si alguien no llega?** El estado existe en la base de datos, pero todavía no
hay botón para marcarlo.

**¿Sirve para otro deporte o país?** El esquema soporta cualquier deporte y
moneda; la zona horaria está fijada a Costa Rica y habría que parametrizarla.
