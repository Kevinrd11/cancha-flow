const SUPABASE_URL = process.env.E2E_SUPABASE_URL ?? "http://127.0.0.1:54321";
// La clave de servicio la da `supabase status` al levantar la base local. No se
// escribe en el repositorio: GitHub bloquea el push al detectar su formato, y
// una clave incrustada acaba copiándose a un entorno real por descuido.
const SECRET_KEY = requireSecretKey();

function requireSecretKey() {
  const key = process.env.E2E_SUPABASE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "Falta E2E_SUPABASE_SECRET_KEY. Levante la base con `supabase start` y expórtela: export E2E_SUPABASE_SECRET_KEY=$(supabase status -o json | jq -r .SERVICE_ROLE_KEY)",
    );
  }
  return key;
}
const FIELD_ID = "00000000-0000-4000-8000-000000000001";

function fechaEnCostaRica(diasDesdeHoy: number) {
  const ahora = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Costa_Rica" }));
  ahora.setDate(ahora.getDate() + diasDesdeHoy);
  return ahora.toISOString().slice(0, 10);
}

/**
 * Crea una solicitud pendiente por el mismo camino que usa el sitio público.
 * Cada caso crea la suya para que la suite se pueda repetir sin resembrar la
 * base: probar contra un dato compartido lo deja consumido tras la primera
 * corrida.
 */
export async function crearSolicitudPendiente(nombre: string) {
  const fecha = fechaEnCostaRica(30);
  // La cancha abre de 08:00 a 23:00; se busca la primera hora libre.
  for (let hora = 8; hora < 22; hora += 1) {
    const inicio = `${String(hora).padStart(2, "0")}:00`;
    const fin = `${String(hora + 1).padStart(2, "0")}:00`;
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/create_public_reservation`, {
      method: "POST",
      headers: {
        apikey: SECRET_KEY,
        Authorization: `Bearer ${SECRET_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        p_field_id: FIELD_ID,
        p_reservation_date: fecha,
        p_start_time: inicio,
        p_end_time: fin,
        p_customer_name: nombre,
        p_customer_phone: `8700${String(hora).padStart(4, "0")}`,
        p_customer_email: null,
      }),
    });
    if (response.ok) {
      const [creada] = (await response.json()) as Array<{ reservation_code: string }>;
      return { codigo: creada.reservation_code, fecha, inicio };
    }
    // 409/P0001 significa que esa hora ya está tomada: se prueba la siguiente.
  }
  throw new Error("No quedó ninguna hora libre para preparar la solicitud");
}
