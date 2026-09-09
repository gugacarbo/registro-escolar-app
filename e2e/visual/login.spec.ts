import { expect, test } from "@playwright/test";

test("@visual mantém o formulário de login", async ({ page }) => {
	await page.goto("/login");

	await expect(page.getByText("Acesse o Registro Escolar com sua conta.")).toBeVisible();
	await expect(page).toHaveScreenshot("login.png", {
		animations: "disabled",
		fullPage: true,
	});
});
