import type { Page } from "@playwright/test";

export class CouncilPage {
	constructor(private page: Page) {}

	async goto(meetingId: string) {
		await this.page.goto(`/meetings/${meetingId}/council`);
	}
}
