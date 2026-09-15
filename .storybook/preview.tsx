import "../src/styles.css";
import type { Decorator, Preview } from "@storybook/react-vite";

/**
 * Dark mode via classe `dark` no <html> (mesmo mecanismo do app: theme-provider
 * usa next-themes com classStrategy; o CSS usa @custom-variant dark (.dark *)).
 * Implementado com globalTypes/toolbar nativo do Storybook (addon-toolbars
 * embutido no core) — sem dependência nova.
 */
const withThemeClass: Decorator = (Story, context) => {
	const theme = context.globals.theme ?? "light";
	if (typeof document !== "undefined") {
		document.documentElement.classList.toggle("dark", theme === "dark");
	}
	return <Story />;
};

const preview: Preview = {
	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/,
			},
		},
		layout: "centered",
	},
	globalTypes: {
		theme: {
			description: "Alterna a classe `dark` no html (tokens do tema Caderno Institucional)",
			toolbar: {
				title: "Tema",
				icon: "circlehollow",
				items: [
					{ value: "light", icon: "circlehollow", title: "Claro" },
					{ value: "dark", icon: "circle", title: "Escuro" },
				],
				dynamicTitle: true,
			},
		},
	},
	decorators: [withThemeClass],
};

export default preview;
