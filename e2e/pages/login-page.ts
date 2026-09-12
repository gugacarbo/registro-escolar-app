import type { Page } from "@playwright/test";

import { gotoReady } from "./navigation";

export class LoginPage {
	constructor(private page: Page) {}

	async goto() {
		await gotoReady(this.page, "/login");
	}

	async fill(email: string, password: string) {
		await this.page.getByRole("textbox", { name: "Email" }).fill(email);
		await this.page.getByRole("textbox", { name: "Senha" }).fill(password);
	}

	async submit() {
		await this.page.getByRole("button", { name: "Entrar" }).click();
	}

	async login(email: string, password: string) {
		await this.goto();
		await this.fill(email, password);
		await this.submit();
	}
}
