import {
	baseURL,
	addParticipant,
	createClass,
	createGeneralReport,
	createMeeting,
	createStaff,
	listRoles,
	startMeeting,
	transitionMeetingResponse,
} from "./fixtures/api";
import { expect, test, type ApiContext } from "./fixtures/test";

async function setup(apiContext: ApiContext, title: string) {
	const klass = await createClass(apiContext, `Turma Relatos ${title}`, "2026");
	const meeting = await createMeeting(apiContext, {
		title: `Reunião Relatos ${title}`,
		heldAt: "2026-05-10",
		classIds: [klass.id],
		participants: [],
	});
	await startMeeting(apiContext, meeting.id);
	return meeting;
}

test.describe("SPEC-0008 relatos gerais", () => {
	test("cria, lista e edita relato", async ({ apiContext }) => {
		const meeting = await setup(apiContext, "CRUD");
		const created = await createGeneralReport(apiContext, meeting.id, "Relato original");
		expect(created).toMatchObject({ texto: "Relato original", includeInMinutes: true });

		const listResponse = await fetch(
			`${baseURL}/api/meetings/${meeting.id}/general-reports`,
			{ headers: { Cookie: apiContext.cookies } },
		);
		expect(listResponse.status).toBe(200);
		const listed = (await listResponse.json()) as Array<{ id: string }>;
		expect(listed.map((report) => report.id)).toContain(created.id);

		const update = await fetch(
			`${baseURL}/api/meetings/${meeting.id}/general-reports/${created.id}`,
			{
				method: "PATCH",
				headers: { Cookie: apiContext.cookies, "Content-Type": "application/json" },
				body: JSON.stringify({ texto: "Relato editado" }),
			},
		);
		expect(update.status).toBe(200);
		expect(await update.json()).toMatchObject({ texto: "Relato editado" });
	});

	test("rejeita texto vazio", async ({ apiContext }) => {
		const meeting = await setup(apiContext, "Texto Vazio");
		const response = await fetch(
			`${baseURL}/api/meetings/${meeting.id}/general-reports`,
			{
				method: "POST",
				headers: { Cookie: apiContext.cookies, "Content-Type": "application/json" },
				body: JSON.stringify({ texto: "" }),
			},
		);
		expect(response.status).toBe(400);
	});

	test("rejeita autor não participante", async ({ apiContext }) => {
		const meeting = await setup(apiContext, "Autor");
		const outsider = await createStaff(apiContext, "Autor Externo");
		const response = await fetch(
			`${baseURL}/api/meetings/${meeting.id}/general-reports`,
			{
				method: "POST",
				headers: { Cookie: apiContext.cookies, "Content-Type": "application/json" },
				body: JSON.stringify({ texto: "Relato externo", origemId: outsider.id }),
			},
		);
		expect(response.status).toBe(422);
	});

	test("armazena relato interno", async ({ apiContext }) => {
		const meeting = await setup(apiContext, "Interno");
		const report = await createGeneralReport(
			apiContext,
			meeting.id,
			"Relato interno",
			{ incluirNaAta: false },
		);
		expect(report.includeInMinutes).toBe(false);
	});

	test("rejeita criação e edição fora de andamento/reaberta", async ({
		apiContext,
	}) => {
		const meeting = await setup(apiContext, "Estado");
		const report = await createGeneralReport(apiContext, meeting.id, "Antes do fim");
		await transitionMeetingResponse(apiContext, meeting.id, "finalize");

		const createResponse = await fetch(
			`${baseURL}/api/meetings/${meeting.id}/general-reports`,
			{
				method: "POST",
				headers: { Cookie: apiContext.cookies, "Content-Type": "application/json" },
				body: JSON.stringify({ texto: "Depois do fim" }),
			},
		);
		expect(createResponse.status).toBe(409);
		expect(await createResponse.json()).toMatchObject({ meetingStatus: "finished" });

		const updateResponse = await fetch(
			`${baseURL}/api/meetings/${meeting.id}/general-reports/${report.id}`,
			{
				method: "PATCH",
				headers: { Cookie: apiContext.cookies, "Content-Type": "application/json" },
				body: JSON.stringify({ texto: "Editar depois do fim" }),
			},
		);
		expect(updateResponse.status).toBe(409);
		expect(await updateResponse.json()).toMatchObject({ meetingStatus: "finished" });
	});

	test("aceita participante como autor", async ({ apiContext }) => {
		const meeting = await setup(apiContext, "Autor Válido");
		const staff = await createStaff(apiContext, "Autor Participante");
		const [role] = (await listRoles(apiContext)).filter((item) => item.name === "Professor");
		const participant = await addParticipant(apiContext, meeting.id, staff.id, role.id);
		const response = await fetch(
			`${baseURL}/api/meetings/${meeting.id}/general-reports`,
			{
				method: "POST",
				headers: { Cookie: apiContext.cookies, "Content-Type": "application/json" },
				body: JSON.stringify({ texto: "Relato com autor", origemId: participant.id }),
			},
		);
		expect(response.status).toBe(201);
		expect(await response.json()).toMatchObject({ originId: participant.id });
	});
});
