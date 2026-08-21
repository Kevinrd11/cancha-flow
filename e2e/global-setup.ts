/**
 * El seed de Supabase crea el centro deportivo y sus reservas, pero no el
 * propietario: en producción lo genera el registro, que es transaccional y pasa
 * por Supabase Auth. Aquí se crea igual que lo haría ese flujo —usuario de Auth
 * primero, membresía después— para que el panel tenga con qué entrar.
 */
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

export const OWNER = {
  email: "e2e-propietario@canchaflow.test",
  password: "Cancha2026Segura!",
  businessId: "00000000-0000-4000-8000-000000000010",
};

const headers = {
  apikey: SECRET_KEY,
  Authorization: `Bearer ${SECRET_KEY}`,
  "content-type": "application/json",
};

async function findUserId(): Promise<string | null> {
  const response = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/users?filter=${encodeURIComponent(OWNER.email)}`,
    { headers },
  );
  if (!response.ok) return null;
  const payload = (await response.json()) as { users?: Array<{ id: string; email: string }> };
  return payload.users?.find((user) => user.email === OWNER.email)?.id ?? null;
}

export default async function globalSetup() {
  // El login está limitado a 10 intentos por cuarto de hora y por IP, y la
  // suite gasta varios en cada corrida. Sin limpiar el contador, la segunda
  // corrida seguida empieza bloqueada. Es estado de prueba, no una relajación
  // de la protección real.
  const limpieza = await fetch(`${SUPABASE_URL}/rest/v1/auth_rate_limits?action=neq.ninguna`, {
    method: "DELETE",
    headers: { ...headers, Prefer: "return=minimal" },
  });
  if (!limpieza.ok) throw new Error(`No se pudo limpiar el rate limit: ${await limpieza.text()}`);

  const created = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email: OWNER.email, password: OWNER.password, email_confirm: true }),
  });

  // Un 422 significa que el usuario ya existe de una corrida anterior.
  let userId: string | null = null;
  if (created.ok) {
    userId = ((await created.json()) as { id: string }).id;
  } else {
    userId = await findUserId();
  }
  if (!userId) throw new Error("No se pudo preparar el propietario de pruebas");

  const profile = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
    method: "PATCH",
    headers: { ...headers, Prefer: "return=minimal" },
    body: JSON.stringify({ role: "owner", active: true, full_name: "Propietario E2E" }),
  });
  if (!profile.ok) throw new Error(`No se pudo activar el perfil: ${await profile.text()}`);

  // on_conflict es obligatorio en PostgREST para que merge-duplicates use la
  // clave compuesta y la preparación sea repetible entre corridas.
  const membership = await fetch(
    `${SUPABASE_URL}/rest/v1/business_members?on_conflict=business_id,user_id`,
    {
      method: "POST",
      headers: { ...headers, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        business_id: OWNER.businessId,
        user_id: userId,
        role: "owner",
        active: true,
      }),
    },
  );
  if (!membership.ok) throw new Error(`No se pudo crear la membresía: ${await membership.text()}`);
}
