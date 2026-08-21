import { expect, test } from "@playwright/test";
import { crearSolicitudPendiente } from "./fixtures";
import { OWNER } from "./global-setup";

test.describe("Panel del propietario", () => {
  test("entra al panel y ve la agenda del día", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Correo").fill(OWNER.email);
    await page.getByLabel("Contraseña").fill(OWNER.password);
    await page.getByRole("button", { name: "Ingresar" }).click();

    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "Resumen" })).toBeVisible();
    // El seed deja reservas de hoy, así que la agenda nunca sale vacía.
    await expect(page.getByText("Agenda de hoy")).toBeVisible();
  });

  test("confirma una solicitud pendiente y registra el cobro", async ({ page }) => {
    const { codigo } = await crearSolicitudPendiente("Cliente E2E Cobro");

    await page.goto("/admin/login");
    await page.getByLabel("Correo").fill(OWNER.email);
    await page.getByLabel("Contraseña").fill(OWNER.password);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page).toHaveURL(/\/admin$/);

    await page.goto("/admin/reservas");
    await page.getByPlaceholder(/Buscar por nombre/).fill(codigo);
    await page.getByText(codigo).click();

    await page.getByRole("button", { name: "Confirmar reserva" }).click();
    await page.getByRole("button", { name: "Cobrada por completo" }).click();

    // El total lo calcula la base de datos. Una vez saldada, la acción de
    // cobro queda deshabilitada: es la señal de que el saldo llegó a cero.
    await expect(page.getByRole("button", { name: "Cobrada por completo" })).toBeDisabled();

    // Se recarga para comprobar que el cobro quedó guardado y no solo pintado.
    await page.reload();
    await page.getByPlaceholder(/Buscar por nombre/).fill(codigo);
    await page.getByText(codigo).click();
    await expect(page.getByText("Pagado")).toBeVisible();
  });

  test("el correo y la contraseña incorrectos no revelan si la cuenta existe", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Correo").fill("no-existe@canchaflow.test");
    await page.getByLabel("Contraseña").fill("ClaveIncorrecta1!");
    await page.getByRole("button", { name: "Ingresar" }).click();

    await expect(page.getByText(/Correo, contraseña o estado de la cuenta inválidos/)).toBeVisible();
  });
});
