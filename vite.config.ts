import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const pwaPlugins = VitePWA({
	registerType: "prompt",
	injectRegister: false,
	manifest: {
		id: "/",
		name: "Registro Escolar",
		short_name: "Registro",
		description: "Controle escolar de estudantes, turmas e reuniões.",
		lang: "pt-BR",
		dir: "ltr",
		start_url: "/",
		scope: "/",
		display: "standalone",
		orientation: "portrait-primary",
		background_color: "#f8fafc",
		theme_color: "#15803d",
		icons: [
			{ src: "/icons/pwa-64x64.png", sizes: "64x64", type: "image/png" },
			{ src: "/icons/pwa-192x192.png", sizes: "192x192", type: "image/png" },
			{ src: "/icons/pwa-512x512.png", sizes: "512x512", type: "image/png" },
			{
				src: "/icons/maskable-icon-512x512.png",
				sizes: "512x512",
				type: "image/png",
				purpose: "maskable",
			},
		],
	},
	includeAssets: [
		"offline.html",
		"icons/favicon.ico",
		"icons/pwa.svg",
		"icons/apple-touch-icon-180x180.png",
	],
	integration: { closeBundleOrder: "post" },
	workbox: {
		globPatterns: [],
		maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
		navigateFallback: null,
		navigateFallbackDenylist: [/^\/api\//],
		// SSR precisa buscar o documento no servidor. Quando a rede falha, o
		// fallback explícito entrega a página offline estática.
		runtimeCaching: [
			{
				urlPattern: ({ request }) => request.mode === "navigate",
				handler: "NetworkOnly",
				options: {
					cacheName: "navigation-network-only",
					precacheFallback: { fallbackURL: "/offline.html" },
				},
			},
			{
				urlPattern: /^\/api\/.*$/,
				handler: "NetworkOnly",
				options: { cacheName: "api-network-only" },
			},
		],
	},
}).map((plugin: Plugin) => ({
	...plugin,
	// O contexto global do plugin resolve manifest e módulo virtual; aqui o
	// Vite aplica os hooks apenas no environment client.
	applyToEnvironment: (
		environment: Parameters<NonNullable<Plugin["applyToEnvironment"]>>[0],
	) => environment.name === "client",
}));

const config = defineConfig({
	resolve: { tsconfigPaths: true },
	plugins: [
		devtools(),
		cloudflare({
			viteEnvironment: { name: "ssr" },
			persistState: process.env.E2E_PERSIST_STATE
				? { path: process.env.E2E_PERSIST_STATE }
				: undefined,
		}),
		tailwindcss(),
		tanstackStart({
			router: {
				// Ignora arquivos de teste colocalizados em src/routes/
				routeFileIgnorePattern: "\\.test\\.(ts|tsx)$",
			},
		}),
		viteReact(),
		...pwaPlugins,
	],
});

export default config;
