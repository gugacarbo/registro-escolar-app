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
import { expect, test } from "./fixtures/test";

async function setupFinishedMeeting(apiContext: Parameters<typeof createClass>[0]) {
	const klass = await createClass(apiContext, "Turma Versões", "2026");
	const meeting = await createMeeting(apiContext, {
		title: "Ata Versões",
		heldAt: "2026-05-10",
		classIds: [klass.id],
		participants: [],
	});
	await startMeeting(apiContext, meeting.id);
	await transitionMeetingResponse(apiContext, meeting.id, "finalize");
	return meeting;
}

test.describe("SPEC-0010 versionamento e aprovação de ata", () => {
	test("gera v1 e v2, preserva PDFs e mantém apenas v2 atual", async ({
		apiContext,
	}) => {
		const meeting = await setupFinishedMeeting(apiContext);
		await generateMinute(apiContext, meeting.id, "Versão v1");
		await transitionMeetingResponse(apiContext, meeting.id, "reopen");
		const resume = await transitionMeetingResponse(apiContext, meeting.id, "start");
		expect(resume.status).toBe(200);
		await transitionMeetingResponse(apiContext, meeting.id, "finalize");
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

	test("nova versão após aprovação volta para pendente", async ({ apiContext }) => {
		const meeting = await setupFinishedMeeting(apiContext);
		const first = await generateMinute(apiContext, meeting.id);
		expect(first.approvalStatus).toBe("pendente_aprovacao");
		await approveMinute(apiContext, meeting.id);

		await transitionMeetingResponse(apiContext, meeting.id, "reopen");
		await transitionMeetingResponse(apiContext, meeting.id, "start");
		await transitionMeetingResponse(apiContext, meeting.id, "finalize");
		const second = await generateMinute(apiContext, meeting.id, "Correção");
		expect(second.version).toBe(2);
		expect(second.approvalStatus).toBe("pendente_aprovacao");
	});
});
