import { expect, type Page } from "@playwright/test";

export class ClassesPage {
	constructor(private page: Page) {}

	async goto() {
		await this.page.goto("/classes");
	}

	async clickNew() {
		await this.page.getByRole("link", { name: "Nova turma" }).last().click();
	}

	async create(name: string, academicPeriod: string) {
		await this.goto();
		await this.clickNew();
		await this.page.waitForURL("/classes/new");
		const nameField = this.page.getByRole("textbox", { name: "Nome" });
		await nameField.click();
		await nameField.fill(name);
		await expect(nameField).toHaveValue(name);
		await this.page.getByRole("textbox", { name: "Período letivo" }).fill(academicPeriod);
		await this.page.getByRole("button", { name: /salvar/i }).click();
	}
}
