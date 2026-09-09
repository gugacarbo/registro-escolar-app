import { test as base, expect } from "@playwright/test";

import { createAuthenticatedContext, type ApiContext } from "./api";
import { resetDatabase } from "./db";

export * from "@playwright/test";

export const test = base.extend<{
	apiContext: ApiContext;
	authenticatedPage: { page: typeof base.prototype.page; apiContext: ApiContext };
}>({
	apiContext: async ({}, use) => {
		const ctx = await createAuthenticatedContext();
		await use(ctx);
	},

	authenticatedPage: async ({ page, apiContext }, use) => {
		// Seed a fresh database and log the page in with the API user.
		resetDatabase();
		await page.goto("/login");
		await page.getByRole("textbox", { name: "Email" }).fill(apiContext.user.email);
		await page.getByRole("textbox", { name: "Senha" }).fill(apiContext.user.password);
		await page.getByRole("button", { name: "Entrar" }).click();
		await page.waitForURL("/");
		await use({ page, apiContext });
	},
});

export { expect };
