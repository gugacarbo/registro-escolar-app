import { expect, type Page } from "@playwright/test";

export class ClassesPage {
	constructor(private page: Page) {}

	async goto() {
		// domcontentloaded returns once the document is parsed; the explicit
		// assertions after each navigation wait for the hydrated UI. Waiting
		// for full "load" here stalls on slow API responses (e.g. a D1 WAL
		// lock held by the test setup) and flakes with ERR_ABORTED.
		await this.page.goto("/classes", { waitUntil: "domcontentloaded" });
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
