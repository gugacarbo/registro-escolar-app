import { expect, test } from "@playwright/test";

import { expectRouteScreenshot } from "./helpers";

test("@visual mantém o formulário de login", async ({ page }) => {
	await page.goto("/login");

	await expect(
		page.getByText("Acesse o Registro Escolar com sua conta."),
	).toBeVisible();
	await expectRouteScreenshot(page, {
		name: "login.png",
		ready: page.getByRole("button", { name: "Entrar" }),
	});
});
