import path from "node:path";
import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/react-vite";

const dirname = path.dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
	stories: ["../src/**/*.stories.@(ts|tsx)"],
	framework: "@storybook/react-vite",
	core: {
		builder: {
			name: "@storybook/builder-vite",
			options: {
				viteConfigPath: ".storybook/vite.config.ts",
			},
		},
	},
	async viteFinal(config) {
		const { mergeConfig } = await import("vite");
		const { default: tailwindcss } = await import("@tailwindcss/vite");

		return mergeConfig(config, {
			plugins: [tailwindcss()],
			resolve: {
				alias: [
					{ find: /^#\/(.*)$/, replacement: path.resolve(dirname, "../src/$1") },
					{ find: /^@\/(.*)$/, replacement: path.resolve(dirname, "../src/$1") },
				],
			},
		});
	},
};

export default config;
