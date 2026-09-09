import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3001";

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 1,
	workers: 1,
	reporter: "list",
	use: {
		baseURL,
		trace: "on-first-retry",
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
	webServer: {
		command: "bun run e2e:setup && bun run build && cp .dev.vars dist/server/.dev.vars && E2E_PERSIST_STATE=.wrangler/state/e2e bunx vite preview --port 3001 --host",
		env: {
			BETTER_AUTH_URL: baseURL,
			BETTER_AUTH_TRUSTED_ORIGINS: baseURL,
		},
		url: baseURL,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
	},
});
