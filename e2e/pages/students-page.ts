import type { Page } from "@playwright/test";

export class StudentsPage {
	constructor(private page: Page) {}

	async goto() {
		await this.page.goto("/students");
	}

	async clickNew() {
		await this.page.getByRole("link", { name: /novo aluno/i }).click();
	}

	async fillName(name: string) {
		await this.page.getByRole("textbox", { name: "Nome" }).fill(name);
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
