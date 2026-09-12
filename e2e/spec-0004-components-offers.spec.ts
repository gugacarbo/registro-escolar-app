import {
	baseURL,
	createClass,
	createComponent,
	createComponentResponse,
	createOfferResponse,
	createStaff,
	softDeleteStaff,
} from "./fixtures/api";
import { expect, test } from "./fixtures/test";
import { gotoReady } from "./pages/navigation";

test.describe("SPEC-0004 componentes e ofertas", () => {
	test("cadastra e lista componente pela UI", async ({
		authenticatedPage: page,
	}) => {
		await gotoReady(page, "/components");
		await page.getByRole("button", { name: "Novo componente" }).click();
		const dialog = page.getByRole("dialog");
		const nameField = dialog.getByRole("textbox", { name: "Nome" });
		await nameField.click();
		await nameField.fill("Matemática E2E");
		await expect(nameField).toHaveValue("Matemática E2E");
		await dialog.getByRole("button", { name: "Salvar" }).click();

		await expect.poll(async () => page.url()).toBe(`${baseURL}/components`);
		await expect(page.getByText("Matemática E2E")).toBeVisible();
	});

	test("abre o detalhe do componente ao clicar na linha", async ({
		authenticatedPage: page,
		apiContext,
	}) => {
		const component = await createComponent(
			apiContext,
			"Componente Linha Clicável",
		);

		await gotoReady(page, "/components");
		const cell = page.getByRole("cell", {
			name: "Componente Linha Clicável",
		});
		await expect(cell).toBeVisible();
		await cell.click();
		await expect(page).toHaveURL(new RegExp(`/components/${component.id}`));
		await expect(
			page.getByRole("heading", { name: "Componente Linha Clicável" }),
		).toBeVisible();
	});

	test("rejeita componente duplicado normalizado", async ({ apiContext }) => {
		const component = await createComponent(apiContext, "Programação");
		const duplicate = await createComponentResponse(apiContext, " PROGRAMAÇÃO ");
		expect(duplicate.status).toBe(409);
		const body = (await duplicate.json()) as {
			existingComponent: { id: string };
		};
		expect(body.existingComponent.id).toBe(component.id);
	});

	test("cria oferta sem professor pela UI", async ({
		authenticatedPage: page,
		apiContext,
	}) => {
		const klass = await createClass(apiContext, "Turma Oferta", "2026");
		const component = await createComponent(apiContext, "Biologia E2E");

		await gotoReady(page, `/classes/${klass.id}/offers`);
		await page.getByRole("button", { name: "Nova oferta" }).click();
		const dialog = page.getByRole("dialog");
		const componentTrigger = dialog.getByRole("combobox", {
			name: "Componente",
		});
		await componentTrigger.click();
		const option = page
			.locator('[data-slot="select-item"]')
			.filter({ hasText: component.name });
		await expect(option).toBeAttached();
		await option.click();
		await expect(componentTrigger).toContainText(component.name);
		await dialog
			.getByRole("button", { name: "Ofertar componente" })
			.click();

		await expect(
			page.getByRole("listitem").filter({ hasText: "Biologia E2E" }),
		).toBeVisible();
		await expect(dialog).not.toBeVisible();
	});

	test("rejeita professor inexistente", async ({ apiContext }) => {
		const klass = await createClass(apiContext, "Turma Professor Inválido", "2026");
		const component = await createComponent(apiContext, "Física E2E");
		const response = await createOfferResponse(apiContext, klass.id, component.id, [
			"staff-inexistente",
		]);
		expect(response.status).toBe(400);
	});

	test("rejeita professor soft-deleted", async ({ apiContext }) => {
		const klass = await createClass(apiContext, "Turma Professor Removido", "2026");
		const component = await createComponent(apiContext, "Química E2E");
		const professor = await createStaff(apiContext, "Professor Removido");
		await softDeleteStaff(apiContext, professor.id);
		const response = await createOfferResponse(apiContext, klass.id, component.id, [
			professor.id,
		]);
		expect(response.status).toBe(400);
	});

	test("rejeita mesma oferta na mesma turma e aceita em outra turma", async ({
		apiContext,
	}) => {
		const first = await createClass(apiContext, "Turma Mesma Oferta", "2026");
		const second = await createClass(apiContext, "Turma Outra Oferta", "2026");
		const component = await createComponent(apiContext, "História E2E");
		const professor = await createStaff(apiContext, "Professor História");

		const firstOffer = await createOfferResponse(
			apiContext,
			first.id,
			component.id,
			[professor.id],
		);
		expect(firstOffer.status).toBe(201);

		const duplicateOffer = await createOfferResponse(
			apiContext,
			first.id,
			component.id,
			[professor.id],
		);
		expect(duplicateOffer.status).toBe(409);

		const otherOffer = await createOfferResponse(
			apiContext,
			second.id,
			component.id,
			[professor.id],
		);
		expect(otherOffer.status).toBe(201);
	});
});
