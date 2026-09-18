import { createMinuteTemplate } from "../fixtures/api";
import { expect, test } from "../fixtures/test";
import { expectRouteScreenshot } from "./helpers";

test("@visual mantém a lista de modelos de ata no padrão de tabela", async ({
	apiContext,
	authenticatedPage,
}) => {
	await createMinuteTemplate(apiContext, {
		name: "Modelo visual de ata",
		headerText: "Cabeçalho visual",
	});

	await authenticatedPage.goto("/minutes/templates");

	await expectRouteScreenshot(authenticatedPage, {
		name: "minutes-templates.png",
		ready: authenticatedPage.getByRole("table", {
			name: "Tabela de presets de ata",
		}),
		mask: [
			authenticatedPage
				.locator("header > div")
				.filter({ hasText: apiContext.user.email }),
		],
	});
	await expect(
		authenticatedPage.getByRole("cell", { name: "Modelo visual de ata" }),
	).toBeVisible();
});
