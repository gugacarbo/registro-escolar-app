import type { Page } from "@playwright/test";

export class ClassesPage {
	constructor(private page: Page) {}

	async goto() {
		await this.page.goto("/classes");
	}

	async clickNew() {
		await this.page.getByRole("link", { name: /nova turma/i }).click();
	}

	async create(name: string, academicPeriod: string) {
		await this.goto();
		await this.clickNew();
		await this.page.waitForURL("/classes/new");
		await this.page.getByRole("textbox", { name: "Nome" }).fill(name);
		await this.page.getByRole("textbox", { name: "Período letivo" }).fill(academicPeriod);
		await this.page.getByRole("button", { name: /salvar/i }).click();
	}
}
