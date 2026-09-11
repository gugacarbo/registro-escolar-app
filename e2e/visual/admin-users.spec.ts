import { createSecondaryUserContext } from "../fixtures/api";
import { test } from "../fixtures/test";
import { expect } from "@playwright/test";
import { expectRouteScreenshot } from "./helpers";

test("@visual mantém a tabela de usuários do admin", async ({
	apiContext,
	authenticatedPage,
}) => {
	const secondary = await createSecondaryUserContext(apiContext);

	await authenticatedPage.goto("/admin/users");

	await expectRouteScreenshot(authenticatedPage, {
		name: "admin-users.png",
		// Aguarda as duas linhas carregarem (footer de paginação determinístico).
		ready: authenticatedPage.getByText(/Mostrando 1–2 de 2/),
		mask: [
			// Email do usuário logado no cabeçalho do app.
			authenticatedPage
				.locator("header > div")
				.filter({ hasText: apiContext.user.email }),
			// Células com dados variáveis (nome) e largura fixa (email, data) —
			// mascarar a célula inteira mantém a caixa estável entre execuções.
			authenticatedPage.locator("table tbody tr > td:nth-child(1)"),
			authenticatedPage.locator("table tbody tr > td:nth-child(2)"),
			authenticatedPage.locator("table tbody tr > td:nth-child(4)"),
		],
	});

	await expect(
		authenticatedPage.getByRole("cell", { name: /Admin permanente/ }),
	).toBeVisible();
	await expect(
		authenticatedPage
			.getByRole("cell", { name: secondary.user.name, exact: true })
			.first(),
	).toBeVisible();
});
