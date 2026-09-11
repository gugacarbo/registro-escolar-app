import { expect } from "@playwright/test";
import { baseURL } from "../fixtures/api";
import { test } from "../fixtures/test";
import { expectRouteScreenshot } from "./helpers";

test("@visual mantém o cartão de cadastro por convite", async ({
	page,
	apiContext,
}) => {
	// Com um usuário já cadastrado (apiContext cria o primeiro), o cadastro
	// público fica restrito (requiresInvite = true) e a rota /register (sem
	// token) exibe o cartão de convite. Aguarda o status estar pronto para
	// o snapshot ser determinístico independente de cold start do banco.
	void apiContext;
	await expect
		.poll(
			async () => {
				const res = await fetch(`${baseURL}/api/invitations/status`);
				const body = (await res.json()) as { requiresInvite: boolean };
				return body.requiresInvite;
			},
			{ timeout: 15_000 },
		)
		.toBeTruthy();

	await page.goto("/register");

	await expect(page.getByText("Cadastro por Convite")).toBeVisible();
	await expectRouteScreenshot(page, {
		name: "register.png",
		ready: page.getByRole("link", { name: "Ir para o login" }),
	});
});
