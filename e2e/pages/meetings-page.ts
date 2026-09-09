import { expect, type Page } from "@playwright/test";

export class MeetingsPage {
	constructor(private page: Page) {}

	async goto() {
		await this.page.goto("/meetings");
	}

	async clickNew() {
		await this.page.getByRole("button", { name: /nova reunião/i }).click();
		await expect(
			this.page.getByRole("dialog").getByRole("textbox", { name: "Nome" }),
		).toBeVisible();
	}

	async createDraft(title: string, heldAt: string) {
		await this.goto();
		await this.clickNew();
		const dialog = this.page.getByRole("dialog");
		await dialog.getByRole("textbox", { name: "Nome" }).fill(title);
		await dialog.getByLabel("Data").fill(heldAt);
		await dialog.getByRole("button", { name: /salvar/i }).click();
	}
}
