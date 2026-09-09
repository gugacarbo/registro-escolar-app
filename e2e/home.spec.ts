import { expect, test } from "@playwright/test";

test("página inicial redireciona para login quando não autenticado", async ({ page }) => {
	await page.goto("/");
	await expect(page.getByText("Acesse o Registro Escolar com sua conta.")).toBeVisible();
	await expect(page.getByRole("textbox", { name: "Email" })).toBeVisible();
	await expect(page.getByRole("textbox", { name: "Senha" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
});
