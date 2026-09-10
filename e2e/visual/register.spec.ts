import { expect, test } from "@playwright/test";

import { expectRouteScreenshot } from "./helpers";

test("@visual mantém o formulário de cadastro", async ({ page }) => {
	await page.goto("/register");

	await expect(
		page.getByText("Cadastre-se para usar o Registro Escolar."),
	).toBeVisible();
	await expectRouteScreenshot(page, {
		name: "register.png",
		ready: page.getByRole("button", { name: "Cadastrar" }),
	});
});
