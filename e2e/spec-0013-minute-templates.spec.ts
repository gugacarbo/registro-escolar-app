import {
	createMeeting,
	createMinuteTemplate,
	previewMinute,
	updateMeetingTemplate,
} from "./fixtures/api";
import { expect, test } from "./fixtures/test";

test.describe("SPEC-0013 modelos de ata", () => {
	test("exibe empty-state com CTA quando não há modelos", async ({
		authenticatedPage: page,
	}) => {
		await page.goto("/minutes/templates");

		await expect(
			page.getByText("Nenhum modelo cadastrado", { exact: true }),
		).toBeVisible();
		await expect(
			page.getByText("Cadastre um modelo para usar na geração das atas."),
		).toBeVisible();

		await page.getByRole("button", { name: "Novo modelo" }).last().click();

		await expect(
			page.getByRole("dialog").getByRole("textbox", { name: "Nome *" }),
		).toBeVisible();
		await expect(
			page.getByRole("button", { name: "Criar modelo" }),
		).toBeVisible();
	});

	test("lista carrega modelos criados via API", async ({
		authenticatedPage: page,
		apiContext,
	}) => {
		const first = await createMinuteTemplate(apiContext, {
			name: "Modelo Lista Alfa",
			headerText: "Cabeçalho alfa",
		});
		const second = await createMinuteTemplate(apiContext, {
			name: "Modelo Lista Beta",
		});

		await page.goto("/minutes/templates");

		await expect(
			page.getByRole("cell", { name: "Modelo Lista Alfa" }),
		).toBeVisible();
		await expect(
			page.getByRole("cell", { name: "Modelo Lista Beta" }),
		).toBeVisible();
		expect(first.id).not.toBe(second.id);
	});

	test("ativa linha com teclado e navega para a página de edição", async ({
		authenticatedPage: page,
		apiContext,
	}) => {
		await createMinuteTemplate(apiContext, { name: "Modelo Teclado" });

		await page.goto("/minutes/templates");
		const row = page
			.getByRole("row", { name: "Modelo Teclado" })
			.first();
		await expect(row).toBeVisible();
		await row.focus();
		await page.keyboard.press("Enter");

		await expect(page).toHaveURL(/\/minutes\/templates\/.+/);
		await expect(
			page.getByRole("heading", { name: "Modelo Teclado" }),
		).toBeVisible();
		await expect(
			page.getByRole("button", { name: "Salvar alterações" }),
		).toBeVisible();
	});

	test("exibe falha para template inexistente sem renderizar formulário", async ({
		authenticatedPage: page,
	}) => {
		await page.goto(
			"/minutes/templates/00000000-0000-0000-0000-000000000000",
		);

		await expect(
			page.getByText("Template de ata não encontrado"),
		).toBeVisible({ timeout: 20_000 });
		await expect(
			page.getByRole("textbox", { name: "Nome *" }),
		).toBeHidden();
		await expect(
			page.getByRole("button", { name: "Salvar alterações" }),
		).toBeHidden();
	});

	test("salva edição do template e a próxima prévia reflete a alteração", async ({
		authenticatedPage: page,
		apiContext,
	}) => {
		const meeting = await createMeeting(apiContext, {
			title: "Reunião Template Editado",
			heldAt: "2026-05-10",
			classIds: [],
			participants: [],
		});
		const template = await createMinuteTemplate(apiContext, {
			name: "Modelo Edição",
			headerText: "Cabeçalho original",
		});
		await updateMeetingTemplate(apiContext, meeting.id, template.id);

		await page.goto(`/minutes/templates/${template.id}`);
		const headerField = page.getByRole("textbox", { name: "Cabeçalho" });
		await expect(headerField).toHaveText("Cabeçalho original");
		await headerField.fill("Cabeçalho revisado no e2e");
		const bodyField = page.getByRole("textbox", { name: "Conteúdo" });
		await bodyField.fill("Conteúdo revisado no e2e");
		await page.getByRole("button", { name: "Salvar alterações" }).click();

		await expect(
			page.getByText("Modelo atualizado", { exact: true }),
		).toBeVisible({ timeout: 20_000 });

		const preview = await previewMinute(apiContext, meeting.id);
		expect(preview.templateId).toBe(template.id);
		expect(preview.content).toContain("CABEÇALHO REVISADO NO E2E");
		expect(preview.content).not.toContain("CABEÇALHO ORIGINAL");
		expect(preview.content).toContain("Conteúdo revisado no e2e");
		expect(preview.content).not.toContain("DATA DA REUNIÃO");
	});

	test("cria modelo pelo popup e personaliza na página de edição", async ({
		authenticatedPage: page,
	}) => {
		await page.goto("/minutes/templates");
		await page.getByRole("button", { name: "Novo modelo" }).last().click();

		const dialog = page.getByRole("dialog");
		await dialog
			.getByRole("textbox", { name: "Nome *" })
			.fill("Modelo Rico e Placeholder");
		await dialog.getByRole("button", { name: "Criar modelo" }).click();

		// O popup cria apenas o nome, fecha e o modelo aparece na listagem.
		await expect(dialog).toBeHidden({ timeout: 20_000 });
		const createdCell = page.getByRole("cell", {
			name: "Modelo Rico e Placeholder",
		});
		await expect(createdCell).toBeVisible();

		// A personalização rica acontece na página de edição.
		await createdCell.click();
		await expect(page).toHaveURL(/\/minutes\/templates\/[^/]+$/, {
			timeout: 20_000,
		});

		const headerField = page.getByRole("textbox", { name: "Cabeçalho" });
		await headerField.click();
		await headerField.fill("Ata de Reunião: ");

		await page.getByRole("button", { name: "Inserir variável" }).first().click();
		await page.getByRole("button", { name: "Título da reunião" }).click();

		await page.getByRole("button", { name: "Salvar alterações" }).click();
		await expect(
			page.getByText("Modelo atualizado", { exact: true }),
		).toBeVisible({ timeout: 20_000 });
	});
});
