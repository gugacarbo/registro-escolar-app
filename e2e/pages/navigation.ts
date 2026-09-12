import type { Page } from "@playwright/test";

// Maximum time for a single navigation attempt. Kept well below the test
// timeout so a stalled preview server fails fast and the next attempt can
// recover once the stall clears.
const NAVIGATION_TIMEOUT_MS = 15_000;

// How many times to retry a navigation. CI stalls observed so far always
// cleared within ~90s; combined with the 90s test timeout this budget lets a
// test ride out a transient stall instead of failing on it.
const NAVIGATION_ATTEMPTS = 5;

export async function gotoReady(page: Page, url: string): Promise<void> {
	let lastError: unknown;
	for (let attempt = 1; attempt <= NAVIGATION_ATTEMPTS; attempt++) {
		try {
			// domcontentloaded resolves once the document is parsed; callers
			// assert on the hydrated UI explicitly. Waiting for full "load"
			// stalls on slow API responses and flakes with ERR_ABORTED.
			await page.goto(url, {
				waitUntil: "domcontentloaded",
				timeout: NAVIGATION_TIMEOUT_MS,
			});
			return;
		} catch (err) {
			lastError = err;
		}
	}
	throw lastError;
}
