import { test as base, expect, type Page } from "@playwright/test";

import { createAuthenticatedContext, type ApiContext } from "./api";

export type { ApiContext };
import { resetDatabase } from "./db";

export * from "@playwright/test";

export const test = base.extend<{
	apiContext: ApiContext;
	authenticatedPage: Page;
}>({
	apiContext: async ({}, use) => {
		resetDatabase();
		const ctx = await createAuthenticatedContext();
		await use(ctx);
	},

	authenticatedPage: async ({ page, apiContext }, use) => {
		await page.goto("/login");
		await page.getByRole("textbox", { name: "Email" }).fill(apiContext.user.email);
		await page.getByRole("textbox", { name: "Senha" }).fill(apiContext.user.password);
		await page.getByRole("button", { name: "Entrar" }).click();
		await page.waitForURL("/");
		await use(page);
	},
});

export { expect };
