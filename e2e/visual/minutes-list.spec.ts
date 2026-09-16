import {
	createClass,
	createMeeting,
	createMinuteTemplate,
	generateMinute,
	startMeeting,
} from "../fixtures/api";
import { expect, test } from "../fixtures/test";
import { expectRouteScreenshot } from "./helpers";

test("@visual mantém a lista de atas no padrão de tabela", async ({
	apiContext,
	authenticatedPage,
}) => {
	const template = await createMinuteTemplate(apiContext, {
		name: "Modelo visual de ata",
		headerText: "Cabeçalho visual",
	});
	const klass = await createClass(apiContext, "Turma Ata Visual", "2026");
	const meeting = await createMeeting(apiContext, {
		title: "Conselho visual de classe",
		heldAt: "2026-05-10",
		classIds: [klass.id],
		templateId: template.id,
	});
	await startMeeting(apiContext, meeting.id);
	await generateMinute(apiContext, meeting.id);

	await authenticatedPage.goto("/minutes");

	await expectRouteScreenshot(authenticatedPage, {
		name: "minutes-list.png",
		ready: authenticatedPage.getByRole("table", {
			name: "Tabela de atas",
		}),
		mask: [
			authenticatedPage
				.locator("header > div")
				.filter({ hasText: apiContext.user.email }),
			// Data dinâmica da coluna "Atualizada em".
			authenticatedPage
				.getByRole("cell")
				.filter({ hasText: /^\d{2}\/\d{2}\/\d{4}$/ }),
		],
	});
	await expect(
		authenticatedPage
			.getByRole("cell", { name: "Conselho visual de classe" }),
	).toBeVisible();
});
