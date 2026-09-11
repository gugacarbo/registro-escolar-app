import {
	baseURL,
	createClass,
	createMeeting,
	createMinuteTemplate,
	generateMinute,
	startMeeting,
} from "./fixtures/api";
import { expect, test } from "./fixtures/test";

test.describe("Lista de atas no padrão de tabela do app", () => {
	test("lista todas as atas, filtra e abre o detalhe ao clicar na linha", async ({
		apiContext,
		authenticatedPage,
	}) => {
		const template = await createMinuteTemplate(apiContext, {
			name: "Modelo lista de atas",
		});
		const klass = await createClass(apiContext, "Turma Lista de Atas", "2026");
		const meeting = await createMeeting(apiContext, {
			title: "Ata da lista de atas",
			heldAt: "2026-05-10",
			classIds: [klass.id],
			templateId: template.id,
		});
		await startMeeting(apiContext, meeting.id);
		await generateMinute(apiContext, meeting.id);

		await authenticatedPage.goto("/minutes");
		const table = authenticatedPage.getByRole("table", {
			name: "Tabela de atas",
		});
		await expect(table).toBeVisible();
		const row = table
			.getByRole("row")
			.filter({ has: authenticatedPage.getByRole("link", { name: "Ata da lista de atas" }) });
		await expect(row).toBeVisible();
		await expect(row.getByRole("cell", { name: "Modelo lista de atas" })).toBeVisible();
		await expect(row.getByRole("cell", { name: "Pendente" })).toBeVisible();

		// Clique na linha (fora dos links) abre a tela de visualização/edição
		// da ata: prévia + geração de versão + aprovação.
		await row
			.getByRole("cell")
			.filter({ has: authenticatedPage.getByText("Pendente", { exact: true }) })
			.click();
		await expect(authenticatedPage).toHaveURL(
			new RegExp(`/minutes/${meeting.id}$`),
		);
		await expect(
			authenticatedPage.getByRole("heading", { name: /^Ata de / }),
		).toBeVisible();
		await expect(
			authenticatedPage.getByText("Prévia da ata"),
		).toBeVisible();
		await expect(
			authenticatedPage.getByRole("heading", {
				name: "Aprovar ata",
			}),
		).toBeVisible();
		await expect(
			authenticatedPage.getByRole("heading", { name: "Versões" }),
		).toBeVisible();

		// Aprovação via UI registra o status na própria tela.
		await authenticatedPage.getByLabel("Data de aprovação").fill("2026-05-20");
		await authenticatedPage.getByRole("button", { name: "Aprovar ata" }).click();
		await expect(authenticatedPage.getByText("Ata aprovada")).toBeVisible();

		// Ao voltar para a lista, a linha reflete a aprovação.
		await authenticatedPage.goto("/minutes");
		await expect(table).toBeVisible();
		await expect(
			table
				.getByRole("row")
				.filter({
					has: authenticatedPage.getByRole("link", {
						name: "Ata da lista de atas",
					}),
				})
				.getByRole("cell", { name: "Aprovada" }),
		).toBeVisible();

		// Busca sem casamento exibe o estado vazio.
		const search = authenticatedPage.getByLabel("Buscar por reunião");
		await search.fill("reunião que não existe");
		await expect(
			authenticatedPage.getByText("Nenhuma ata encontrada"),
		).toBeVisible();
		await expect(
			table.getByRole("cell", { name: "Ata da lista de atas" }),
		).toBeHidden();
	});

	test("filtra por status de aprovação", async ({
		apiContext,
		authenticatedPage,
	}) => {
		await createMinuteTemplate(apiContext, { name: "Modelo lista de atas" });
		const klass = await createClass(apiContext, "Turma Filtro de Atas", "2026");
		const pending = await createMeeting(apiContext, {
			title: "Ata pendente no filtro",
			heldAt: "2026-05-10",
			classIds: [klass.id],
		});
		await startMeeting(apiContext, pending.id);
		await generateMinute(apiContext, pending.id);

		const approved = await createMeeting(apiContext, {
			title: "Ata aprovada no filtro",
			heldAt: "2026-05-11",
			classIds: [klass.id],
		});
		await startMeeting(apiContext, approved.id);
		await generateMinute(apiContext, approved.id, "observação do teste");
		const approveResponse = await fetch(
			`${baseURL}/api/meetings/${approved.id}/minutes/approve`,
			{
				method: "PATCH",
				headers: {
					Cookie: apiContext.cookies,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({}),
			},
		);
		expect(approveResponse.ok).toBe(true);

		await authenticatedPage.goto("/minutes");
		const table = authenticatedPage.getByRole("table", {
			name: "Tabela de atas",
		});
		await expect(table).toBeVisible();
		await authenticatedPage
			.getByRole("combobox", { name: "Status de aprovação" })
			.click();
		await authenticatedPage
			.getByRole("option", { name: "Aprovada", exact: true })
			.click();

		await expect(
			table.getByRole("cell", { name: "Ata aprovada no filtro" }),
		).toBeVisible();
		await expect(
			table.getByRole("cell", { name: "Ata pendente no filtro" }),
		).toBeHidden();
	});
});
