import path from "node:path";
import { defineConfig } from "vitest/config";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";

const ROOT = path.resolve(__dirname, ".");

export default defineConfig({
	resolve: {
		alias: [
			{ find: /^#\/(.*)$/, replacement: path.resolve(ROOT, "./src/$1") },
			{ find: /^@\/(.*)$/, replacement: path.resolve(ROOT, "./src/$1") },
		],
	},
	test: {
		projects: [
			{
				extends: true,
				plugins: [storybookTest({ configDir: ".storybook" })],
				test: {
					name: "storybook",
					browser: {
						enabled: true,
						headless: true,
						provider: "playwright",
						instances: [{ browser: "chromium" }],
					},
				},
			},
		],
		environment: "happy-dom",
		setupFiles: ["./src/test/setup.ts"],
		globals: true,
		include: ["src/**/*.test.{ts,tsx}"],
		coverage: {
			provider: "v8",
			reporter: ["text", "html", "json"],
			reportsDirectory: "./coverage",
			all: false,
			thresholds: {
				lines: 95,
				functions: 95,
				statements: 95,
				branches: 95,
			},
			include: ["src/**/*.{ts,tsx}"],
			exclude: [
				"src/**/*.test.{ts,tsx}",
				"src/components/ui/**/*",
				"src/routeTree.gen.ts",
				"src/default-entry.ts",
				"src/integrations/tanstack-query/devtools.tsx",
				"src/styles.css",
				"src/test/**/*",
				"src/db/auth-schema.ts",
				"src/db/schema.ts",
				"src/middleware/d1.ts",
				"src/db/**/*-schema.ts",
			],
		},
	},
});
