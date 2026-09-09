import type { Page } from "@playwright/test";

export class MeetingsPage {
	constructor(private page: Page) {}

	async goto() {
		await this.page.goto("/meetings");
	}

	async clickNew() {
		await this.page.getByRole("link", { name: /nova reunião/i }).click();
	}

	async createDraft(title: string, heldAt: string) {
		await this.goto();
		await this.clickNew();
		await this.page.waitForURL("/meetings/new");
		await this.page.getByRole("textbox", { name: "Título" }).fill(title);
		await this.page.getByLabel("Data").fill(heldAt);
		await this.page.getByRole("button", { name: /salvar/i }).click();
	}
}
