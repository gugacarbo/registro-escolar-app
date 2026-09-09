import {
	baseURL,
	createClass,
	createEnrollment,
	createIndependentRecord,
	createLinkedRecord,
	createMeeting,
	createStudent,
	transitionMeetingResponse,
} from "./fixtures/api";
import { expect, test } from "./fixtures/test";

test.describe("SPEC-0005 ciclo de vida da reunião", () => {
	test("cria reunião em rascunho", async ({ apiContext }) => {
		const meeting = await createMeeting(apiContext, {
			title: "Conselho Rascunho",
			heldAt: "2026-05-10",
			classIds: [],
			participants: [],
		});
		expect(meeting.status).toBe("draft");
	});

	test("rejeita início sem turmas", async ({ apiContext }) => {
		const meeting = await createMeeting(apiContext, {
			title: "Reunião Sem Turmas",
			heldAt: "2026-05-10",
			classIds: [],
			participants: [],
		});
		const response = await transitionMeetingResponse(apiContext, meeting.id, "start");
		expect(response.status).toBe(422);
	});

	test("inicia, finaliza e reabre reunião", async ({ apiContext }) => {
		const klass = await createClass(apiContext, "Turma Ciclo", "2026");
		const meeting = await createMeeting(apiContext, {
			title: "Reunião Ciclo",
			heldAt: "2026-05-10",
			classIds: [klass.id],
			participants: [],
		});

		const start = await transitionMeetingResponse(apiContext, meeting.id, "start");
		expect(start.status).toBe(200);
		expect(((await start.json()) as { status: string }).status).toBe("in_progress");

		const finish = await transitionMeetingResponse(apiContext, meeting.id, "finalize");
		expect(finish.status).toBe(200);
		expect(((await finish.json()) as { status: string }).status).toBe("finished");

		const reopen = await transitionMeetingResponse(apiContext, meeting.id, "reopen");
		expect(reopen.status).toBe(200);
		const reopened = (await reopen.json()) as { status: string; hint: string };
		expect(reopened.status).toBe("reopened");
		expect(reopened.hint).toContain("start");
	});

	test("rejeita iniciar reunião já em andamento", async ({ apiContext }) => {
		const klass = await createClass(apiContext, "Turma Já Iniciada", "2026");
		const meeting = await createMeeting(apiContext, {
			title: "Reunião Já Iniciada",
			heldAt: "2026-05-10",
			classIds: [klass.id],
			participants: [],
		});
		await transitionMeetingResponse(apiContext, meeting.id, "start");
		const response = await transitionMeetingResponse(apiContext, meeting.id, "start");
		expect(response.status).toBe(409);
	});

	test("rejeita criar e editar registro vinculado em reunião finalizada", async ({
		apiContext,
	}) => {
		const klass = await createClass(apiContext, "Turma Finalizada", "2026");
		const student = await createStudent(apiContext, "Aluno Finalizado");
		await createEnrollment(apiContext, {
			alunoId: student.id,
			turmaId: klass.id,
			dataInicio: "2026-01-01",
		});
		const meeting = await createMeeting(apiContext, {
			title: "Reunião Finalizada",
			heldAt: "2026-05-10",
			classIds: [klass.id],
			participants: [],
		});
		await transitionMeetingResponse(apiContext, meeting.id, "start");
		const record = await createLinkedRecord(apiContext, meeting.id, student.id, "Registro antes do fim");
		await transitionMeetingResponse(apiContext, meeting.id, "finalize");

		const createResponse = await fetch(
			`${baseURL}/api/meetings/${meeting.id}/students/${student.id}/records`,
			{
				method: "POST",
				headers: { Cookie: apiContext.cookies, "Content-Type": "application/json" },
				body: JSON.stringify({ texto: "Registro depois do fim" }),
			},
		);
		expect(createResponse.status).toBe(409);
		expect(await createResponse.json()).toMatchObject({ meetingStatus: "finished" });

		const updateResponse = await fetch(
			`${baseURL}/api/meetings/${meeting.id}/records/${record.id}`,
			{
				method: "PATCH",
				headers: { Cookie: apiContext.cookies, "Content-Type": "application/json" },
				body: JSON.stringify({ texto: "Tentativa de edição" }),
			},
		);
		expect(updateResponse.status).toBe(409);
		expect(await updateResponse.json()).toMatchObject({ meetingStatus: "finished" });
	});

	test("permite registro independente com reunião finalizada", async ({
		apiContext,
	}) => {
		const klass = await createClass(apiContext, "Turma Independente", "2026");
		const student = await createStudent(apiContext, "Aluno Independente");
		const meeting = await createMeeting(apiContext, {
			title: "Reunião Independente",
			heldAt: "2026-05-10",
			classIds: [klass.id],
			participants: [],
		});
		await transitionMeetingResponse(apiContext, meeting.id, "start");
		await transitionMeetingResponse(apiContext, meeting.id, "finalize");
		const record = await createIndependentRecord(
			apiContext,
			student.id,
			"Registro independente pós-fim",
		);
		expect(record).toMatchObject({ texto: "Registro independente pós-fim" });
	});
});
