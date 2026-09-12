import { expect, type Page } from "@playwright/test";

import { gotoReady } from "./navigation";

export class ClassesPage {
	constructor(private page: Page) {}

	async goto() {
		await gotoReady(this.page, "/classes");
	}

	async clickNew() {
		await this.page.getByRole("button", { name: "Nova turma" }).click();
		await expect(
			this.page.getByRole("dialog").getByRole("textbox", { name: "Nome" }),
		).toBeVisible();
	}

	async create(name: string, academicPeriod: string) {
		await this.goto();
		await this.clickNew();
		const dialog = this.page.getByRole("dialog");
		const nameField = dialog.getByRole("textbox", { name: "Nome" });
		await nameField.click();
		await nameField.fill(name);
		await expect(nameField).toHaveValue(name);
		await dialog
			.getByRole("textbox", { name: "Período letivo" })
			.fill(academicPeriod);
		await dialog.getByRole("button", { name: /salvar/i }).click();
	}
}
