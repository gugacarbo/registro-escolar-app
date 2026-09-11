import {
	baseURL,
	approveMinute,
	createClass,
	createMeeting,
	generateMinute,
	listMinuteVersions,
	startMeeting,
	transitionMeetingResponse,
} from "./fixtures/api";
import { expect, test, type ApiContext } from "./fixtures/test";

async function setupFinishedMeeting(apiContext: ApiContext) {
	const klass = await createClass(apiContext, "Turma Versões", "2026");
	const meeting = await createMeeting(apiContext, {
		title: "Ata Versões",
		heldAt: "2026-05-10",
		classIds: [klass.id],
		participants: [],
	});
	const setupStart = await startMeeting(apiContext, meeting.id);
	expect(setupStart.status).toBe("in_progress");
	const setupFinish = await transitionMeetingResponse(apiContext, meeting.id, "finalize");
	expect(setupFinish.status).toBe(200);
	return meeting;
}

test.describe("SPEC-0010 versionamento e aprovação de ata", () => {
	test("gera v1 e v2, preserva PDFs e mantém apenas v2 atual", async ({
		apiContext,
	}) => {
		const meeting = await setupFinishedMeeting(apiContext);
		await generateMinute(apiContext, meeting.id, "Versão v1");
		const reopen = await transitionMeetingResponse(apiContext, meeting.id, "reopen");
		expect(reopen.status).toBe(200);
		const resume = await transitionMeetingResponse(apiContext, meeting.id, "start");
		expect(resume.status).toBe(200);
		const finish = await transitionMeetingResponse(apiContext, meeting.id, "finalize");
		expect(finish.status).toBe(200);
		const second = await generateMinute(apiContext, meeting.id, "Versão v2");

		expect(second.version).toBe(2);
		const versions = await listMinuteVersions(apiContext, meeting.id);
		expect(versions.map((version) => version.version)).toEqual([2, 1]);
		expect(versions.filter((version) => version.isCurrent)).toHaveLength(1);
		expect(versions.find((version) => version.version === 2)?.isCurrent).toBe(true);
		expect(versions.every((version) => version.hasPdf)).toBe(true);

		for (const version of [1, 2]) {
			const response = await fetch(
				`${baseURL}/api/meetings/${meeting.id}/minutes/versions/${version}/pdf`,
				{ headers: { Cookie: apiContext.cookies } },
			);
			expect(response.status).toBe(200);
			expect(response.headers.get("content-type")).toBe("application/pdf");
			expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(0);
		}
	});

	test("aprova versão atual com data automática e observação opcional", async ({
		apiContext,
	}) => {
		const meeting = await setupFinishedMeeting(apiContext);
		await generateMinute(apiContext, meeting.id);
		const approved = await approveMinute(apiContext, meeting.id, undefined, "Aprovada no conselho");
		expect(approved.approvalStatus).toBe("aprovada");
		expect(approved.approvedAt).not.toBeNull();
		expect(approved.approvalNotes).toBe("Aprovada no conselho");
	});

	test("rejeita aprovação sem versão atual", async ({ apiContext }) => {
		const meeting = await setupFinishedMeeting(apiContext);
		const response = await fetch(`${baseURL}/api/meetings/${meeting.id}/minutes/approve`, {
			method: "PATCH",
			headers: { Cookie: apiContext.cookies, "Content-Type": "application/json" },
			body: JSON.stringify({}),
		});
		expect(response.status).toBe(404);
		expect(await response.json()).toMatchObject({ error: "Nenhuma ata gerada para esta reunião" });
	});

	test("rejeita segunda aprovação de ata já aprovada", async ({ apiContext }) => {
		const meeting = await setupFinishedMeeting(apiContext);
		await generateMinute(apiContext, meeting.id);
		const approved = await approveMinute(apiContext, meeting.id);
		expect(approved.approvalStatus).toBe("aprovada");

		const response = await fetch(
			`${baseURL}/api/meetings/${meeting.id}/minutes/approve`,
			{
				method: "PATCH",
				headers: { Cookie: apiContext.cookies, "Content-Type": "application/json" },
				body: JSON.stringify({ observacao: "Aprovação duplicada" }),
			},
		);
		expect(response.status).toBe(409);
		expect(await response.json()).toMatchObject({ error: "Ata já aprovada" });
	});

	test("exibe versões e link de PDF na tela da ata", async ({
		authenticatedPage: page,
		apiContext,
	}) => {
		const meeting = await setupFinishedMeeting(apiContext);
		await generateMinute(apiContext, meeting.id, "Versão UI");

		await page.goto(`/minutes/${meeting.id}`);
		await expect(
			page.getByRole("heading", { name: "Versões", exact: true }),
		).toBeVisible();
		await expect(page.getByText("Versão 1", { exact: true })).toBeVisible();
		await expect(page.getByText("1 versão(ões) gerada(s)")).toBeVisible();

		const pdfLink = page.getByRole("link", { name: "Baixar PDF" });
		await expect(pdfLink).toBeVisible();
		await expect(pdfLink).toHaveAttribute(
			"href",
			`/api/meetings/${meeting.id}/minutes/versions/1/pdf`,
		);
	});

	test("nova versão após aprovação volta para pendente", async ({ apiContext }) => {
		const meeting = await setupFinishedMeeting(apiContext);
		const first = await generateMinute(apiContext, meeting.id);
		expect(first.approvalStatus).toBe("pendente_aprovacao");
		await approveMinute(apiContext, meeting.id);

		const reopen = await transitionMeetingResponse(apiContext, meeting.id, "reopen");
		expect(reopen.status).toBe(200);
		const resume = await transitionMeetingResponse(apiContext, meeting.id, "start");
		expect(resume.status).toBe(200);
		const finish = await transitionMeetingResponse(apiContext, meeting.id, "finalize");
		expect(finish.status).toBe(200);
		const second = await generateMinute(apiContext, meeting.id, "Correção");
		expect(second.version).toBe(2);
		expect(second.approvalStatus).toBe("pendente_aprovacao");
	});
});
