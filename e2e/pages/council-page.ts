import type { Page } from "@playwright/test";

import { gotoReady } from "./navigation";

export class CouncilPage {
	constructor(private page: Page) {}

	async goto(meetingId: string) {
		await gotoReady(this.page, `/meetings/${meetingId}/council`);
	}
}
