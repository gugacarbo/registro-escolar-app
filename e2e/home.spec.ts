import { expect, test } from "@playwright/test";

test("página inicial exibe título de boas-vindas", async ({ page }) => {
	await page.goto("/");
	await expect(page.getByRole("heading", { name: "Carregando" })).toBeVisible();
});
