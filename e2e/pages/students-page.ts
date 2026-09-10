import { expect, type Page } from "@playwright/test";

export class StudentsPage {
	constructor(private page: Page) {}

	async goto() {
		await this.page.goto("/students");
	}

	async clickNew() {
		await this.page.getByRole("button", { name: "Novo estudante" }).click();
		await expect(
			this.page.getByRole("dialog").getByRole("textbox", { name: "Nome" }),
		).toBeVisible();
	}

	async fillName(name: string) {
		const nameField = this.page
			.getByRole("dialog")
			.getByRole("textbox", { name: "Nome" });
		await nameField.click();
		await nameField.fill(name);
		await expect(nameField).toHaveValue(name);
	}

	async submit() {
		await this.page
			.getByRole("dialog")
			.getByRole("button", { name: /salvar/i })
			.click();
	}

	async create(name: string) {
		await this.goto();
		await this.clickNew();
		await this.fillName(name);
		await this.submit();
	}
}
