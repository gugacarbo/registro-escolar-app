import { createMinuteTemplate } from "../fixtures/api";
import { expect, test } from "../fixtures/test";
import { expectRouteScreenshot } from "./helpers";

test("@visual mantém a tela de edição do modelo de ata", async ({
	apiContext,
	authenticatedPage,
}) => {
	const template = await createMinuteTemplate(apiContext, {
		name: "Modelo de edição",
		headerText: "Cabeçalho da ata editado",
		footerText: "Rodapé da ata editado",
	});

	await authenticatedPage.goto(`/minutes/templates/${template.id}`);

	const headerField = authenticatedPage.getByRole("textbox", {
		name: "Cabeçalho",
	});
	const footerField = authenticatedPage.getByRole("textbox", {
		name: "Rodapé",
	});

	await expectRouteScreenshot(authenticatedPage, {
		name: "minutes-template-edit.png",
		ready: authenticatedPage.getByRole("button", {
			name: "Salvar alterações",
		}),
		mask: [
			authenticatedPage
				.locator("header > div")
				.filter({ hasText: apiContext.user.email }),
		],
	});
	await expect(headerField).toHaveText("Cabeçalho da ata editado");
	await expect(footerField).toHaveText("Rodapé da ata editado");
});
