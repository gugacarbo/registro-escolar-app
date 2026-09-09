import { expect, type Page } from "@playwright/test";

export class StudentsPage {
	constructor(private page: Page) {}

	async goto() {
		await this.page.goto("/students");
	}

	async clickNew() {
		await this.page.getByRole("link", { name: "Novo aluno" }).last().click();
	}

	async fillName(name: string) {
		const nameField = this.page.getByRole("textbox", { name: "Nome" });
		await nameField.click();
		await nameField.fill(name);
		await expect(nameField).toHaveValue(name);
	}

	async submit() {
		await this.page.getByRole("button", { name: /salvar/i }).click();
	}

	async create(name: string) {
		await this.goto();
		await this.clickNew();
		await this.page.waitForURL("/students/new");
		await this.fillName(name);
		await this.submit();
	}
}
