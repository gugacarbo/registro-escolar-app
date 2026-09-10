import { expect, test } from "@playwright/test";

import { expectRouteScreenshot } from "./helpers";

test("@visual mantém a tela de login após a raiz redirecionar", async ({
	page,
}) => {
	await page.goto("/");

	await expect(page).toHaveURL(/\/login$/);
	await expectRouteScreenshot(page, {
		name: "home.png",
		ready: page.getByRole("button", { name: "Entrar" }),
	});
});
