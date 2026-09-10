import { expect, type Locator, type Page } from "@playwright/test";

export type RouteScreenshot = {
	/** Nome da baseline versionada, derivado da rota (ex.: `login.png`). */
	name: string;
	/** Elemento que confirma que a rota terminou de renderizar. */
	ready: Locator;
};

/**
 * Espera a rota atingir um estado estável (marcador visível, fontes e imagens
 * carregadas) e compara a screenshot de página inteira com a baseline da rota.
 */
export async function expectRouteScreenshot(
	page: Page,
	{ name, ready }: RouteScreenshot,
) {
	await expect(ready).toBeVisible();
	await expect(page.locator("body")).toBeVisible();
	await waitForFontsAndImages(page);

	await expect(page).toHaveScreenshot(name, {
		animations: "disabled",
		fullPage: true,
	});
}

async function waitForFontsAndImages(page: Page) {
	await page.evaluate(async () => {
		await document.fonts.ready;
		const pendingImages = Array.from(document.images)
			.filter((image) => !image.complete)
			.map(
				(image) =>
					new Promise<void>((resolve) => {
						image.addEventListener("load", () => resolve(), { once: true });
						image.addEventListener("error", () => resolve(), { once: true });
					}),
			);
		await Promise.all(pendingImages);
	});
}
