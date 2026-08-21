import { expect, test } from "@playwright/test";

/**
 * El recorrido que decide la venta: un jugador reserva sin crear cuenta.
 * Se elige siempre la última fecha del selector para no chocar con los datos
 * de demostración, que ocupan hoy y mañana.
 */
test.describe("Reserva pública", () => {
  test("un jugador reserva sin crear cuenta y recibe su número de solicitud", async ({ page }) => {
    await page.goto("/centro/arena-ciudad-quesada#reservar");

    // Última fecha ofrecida: la más lejana y por tanto la más libre.
    const dias = page.getByRole("button", { name: /^(lun|mar|mié|jue|vie|sáb|dom)/i });
    await dias.last().click();

    const libre = page.getByRole("button", { name: /Disponible$/ }).first();
    await expect(libre).toBeVisible();
    await libre.click();

    await page.getByRole("button", { name: "Continuar" }).click();

    await page.getByLabel("Nombre completo").fill("Jugador E2E");
    await page.getByLabel("Teléfono").fill("8712-0099");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Enviar solicitud de reserva" }).click();

    await expect(page.getByText("Solicitud recibida")).toBeVisible();
    // El código lo genera la base de datos; no debe venir del cliente.
    await expect(page.getByText(/^CF-[A-Z0-9]{6,12}$/)).toBeVisible();
  });

  test("no ofrece horarios ya pasados del día de hoy", async ({ page }) => {
    await page.goto("/centro/arena-ciudad-quesada#reservar");

    const horas = await page.getByRole("button", { name: /(a\. m\.|p\. m\.),/ }).allInnerTexts();
    const ahora = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Costa_Rica" }));
    for (const texto of horas) {
      const [, hora, minutos, meridiano] = texto.match(/(\d{1,2}):(\d{2})\s*(a\. m\.|p\. m\.)/) ?? [];
      if (!hora) continue;
      let valor = Number(hora) % 12;
      if (meridiano === "p. m.") valor += 12;
      expect(valor * 60 + Number(minutos)).toBeGreaterThan(ahora.getHours() * 60 + ahora.getMinutes());
    }
  });
});
