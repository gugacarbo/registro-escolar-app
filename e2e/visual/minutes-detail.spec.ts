import {
	createClass,
	createMeeting,
	createMinuteTemplate,
	generateMinute,
	reopenMeeting,
} from "../fixtures/api";
import { expect, test } from "../fixtures/test";
import { expectRouteScreenshot } from "./helpers";

test("@visual mantém a tela de visualização/edição da ata", async ({
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
	await generateMinute(apiContext, meeting.id);
	// ADR-0021: gerar a ata encerra a reunião e a tela passa para read-only.
	// Reabrimos para fotografar o estado editável, que é o alvo deste teste
	// (o estado encerrado é coberto pelos e2e de ciclo de vida).
	await reopenMeeting(apiContext, meeting.id);

	await authenticatedPage.goto(`/minutes/${meeting.id}`);

	await expectRouteScreenshot(authenticatedPage, {
		name: "minutes-detail.png",
		ready: authenticatedPage.getByRole("heading", {
			name: "Ata de Conselho visual de classe",
		}),
		mask: [
			authenticatedPage
				.locator("header > div")
				.filter({ hasText: apiContext.user.email }),
			// Timestamp dinâmico da versão gerada.
			authenticatedPage.getByText(/\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}:\d{2}/),
		],
	});
	await expect(
		authenticatedPage.getByText("Prévia da ata"),
	).toBeVisible();
});
