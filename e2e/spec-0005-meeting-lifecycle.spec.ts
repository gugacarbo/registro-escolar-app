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
	test("cria reunião em rascunho pela UI", async ({
		authenticatedPage: page,
		apiContext,
	}) => {
		const klass = await createClass(apiContext, "Turma UI Reunião", "2026");
		await page.goto("/meetings");
		await page.getByRole("button", { name: "Nova reunião" }).click();
		const dialog = page.getByRole("dialog");
		const nameField = dialog.getByRole("textbox", { name: "Nome" });
		await nameField.click();
		await nameField.fill("Conselho UI");
		await expect(nameField).toHaveValue("Conselho UI");
		await dialog.locator("input[type=date]").fill("2026-05-10");
		await dialog
			.locator("label")
			.filter({ hasText: `${klass.name} — 2026` })
			.locator("button")
			.first()
			.click();
		await dialog.getByRole("button", { name: "Salvar" }).click();
		await expect(page.getByRole("heading", { name: "Conselho UI" })).toBeVisible();
		await expect(page.getByText("Rascunho", { exact: true })).toBeVisible();
	});

	test("abre o detalhe da reunião ao clicar na linha", async ({
		authenticatedPage: page,
		apiContext,
	}) => {
		const meeting = await createMeeting(apiContext, {
			title: "Reunião Linha Clicável",
			heldAt: "2026-05-10",
			classIds: [],
			participants: [],
		});

		await page.goto("/meetings");
		const cell = page.getByRole("cell", { name: "Reunião Linha Clicável" });
		await expect(cell).toBeVisible();
		await cell.click();
		await expect(page).toHaveURL(new RegExp(`/meetings/${meeting.id}`));
		await expect(
			page.getByRole("heading", { name: "Reunião Linha Clicável" }),
		).toBeVisible();
	});

	test("cria reunião em rascunho via API", async ({ apiContext }) => {
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

		const finish = await transitionMeetingResponse(
			apiContext,
			meeting.id,
			"finalize",
		);
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
		const setupStart = await transitionMeetingResponse(apiContext, meeting.id, "start");
		expect(setupStart.status).toBe(200);
		const response = await transitionMeetingResponse(apiContext, meeting.id, "start");
		expect(response.status).toBe(409);
	});

	test("rejeita criar e editar registro vinculado em reunião finalizada", async ({
		apiContext,
	}) => {
		const klass = await createClass(apiContext, "Turma Finalizada", "2026");
		const student = await createStudent(apiContext, "Estudante Finalizado");
		await createEnrollment(apiContext, {
			estudanteId: student.id,
			turmaId: klass.id,
			dataInicio: "2026-01-01",
		});
		const meeting = await createMeeting(apiContext, {
			title: "Reunião Finalizada",
			heldAt: "2026-05-10",
			classIds: [klass.id],
			participants: [],
		});
		const setupStart = await transitionMeetingResponse(apiContext, meeting.id, "start");
		expect(setupStart.status).toBe(200);
		const record = await createLinkedRecord(apiContext, meeting.id, student.id, "Registro antes do fim");
		const setupFinish = await transitionMeetingResponse(
			apiContext,
			meeting.id,
			"finalize",
		);
		expect(setupFinish.status).toBe(200);

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

	test("transições pela UI atualizam o badge", async ({
		authenticatedPage: page,
		apiContext,
	}) => {
		const klass = await createClass(apiContext, "Turma Transição UI", "2026");
		const meeting = await createMeeting(apiContext, {
			title: "Reunião Transição UI",
			heldAt: "2026-05-10",
			classIds: [klass.id],
			participants: [],
		});

		await page.goto(`/meetings/${meeting.id}`);
		await expect(page.getByText("Rascunho", { exact: true })).toBeVisible();

		await page.getByRole("button", { name: "Iniciar", exact: true }).click();
		await page.getByRole("button", { name: "Confirmar início" }).click();
		await expect(page.getByText("Em andamento", { exact: true })).toBeVisible();

		await page.getByRole("button", { name: "Finalizar" }).click();
		await page.getByRole("button", { name: "Confirmar finalização" }).click();
		await expect(page.getByText("Finalizada", { exact: true })).toBeVisible();
	});

	test("rejeita finalizar a partir de rascunho (409)", async ({
		apiContext,
	}) => {
		const klass = await createClass(apiContext, "Turma Finalizar Rascunho", "2026");
		const meeting = await createMeeting(apiContext, {
			title: "Reunião Finalizar Rascunho",
			heldAt: "2026-05-10",
			classIds: [klass.id],
			participants: [],
		});
		const response = await transitionMeetingResponse(
			apiContext,
			meeting.id,
			"finalize",
		);
		expect(response.status).toBe(409);
	});

	test("ciclo completo finalizada → reaberta → em andamento → finalizada", async ({
		apiContext,
	}) => {
		const klass = await createClass(apiContext, "Turma Ciclo Completo", "2026");
		const meeting = await createMeeting(apiContext, {
			title: "Reunião Ciclo Completo",
			heldAt: "2026-05-10",
			classIds: [klass.id],
			participants: [],
		});

		const start = await transitionMeetingResponse(apiContext, meeting.id, "start");
		expect(start.status).toBe(200);
		expect(((await start.json()) as { status: string }).status).toBe("in_progress");
		const finish = await transitionMeetingResponse(
			apiContext,
			meeting.id,
			"finalize",
		);
		expect(finish.status).toBe(200);
		expect(((await finish.json()) as { status: string }).status).toBe("finished");

		const reopen = await transitionMeetingResponse(apiContext, meeting.id, "reopen");
		expect(reopen.status).toBe(200);
		expect(((await reopen.json()) as { status: string }).status).toBe("reopened");

		const resume = await transitionMeetingResponse(apiContext, meeting.id, "start");
		expect(resume.status).toBe(200);
		expect(((await resume.json()) as { status: string }).status).toBe("in_progress");

		const finalize = await transitionMeetingResponse(
			apiContext,
			meeting.id,
			"finalize",
		);
		expect(finalize.status).toBe(200);
		expect(((await finalize.json()) as { status: string }).status).toBe("finished");
	});

	test("edita dados e turmas com a reunião em andamento (bordas 7/8)", async ({
		apiContext,
	}) => {
		const klass = await createClass(apiContext, "Turma Editável", "2026");
		const extra = await createClass(apiContext, "Turma Adicionada", "2026");
		const meeting = await createMeeting(apiContext, {
			title: "Reunião Editável",
			heldAt: "2026-05-10",
			classIds: [klass.id],
			participants: [],
		});
		const start = await transitionMeetingResponse(
			apiContext,
			meeting.id,
			"start",
		);
		expect(start.status).toBe(200);

		const patch = await fetch(`${baseURL}/api/meetings/${meeting.id}`, {
			method: "PATCH",
			headers: {
				Cookie: apiContext.cookies,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ title: "Reunião Editada", heldAt: "2026-06-01" }),
		});
		expect(patch.status).toBe(200);
		expect(await patch.json()).toMatchObject({
			title: "Reunião Editada",
			status: "in_progress",
		});

		const add = await fetch(
			`${baseURL}/api/meetings/${meeting.id}/classes`,
			{
				method: "POST",
				headers: {
					Cookie: apiContext.cookies,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ classId: extra.id }),
			},
		);
		expect(add.status).toBe(201);
		expect(await add.json()).toMatchObject({ classId: extra.id });

		const list = await fetch(
			`${baseURL}/api/meetings/${meeting.id}/classes`,
			{ headers: { Cookie: apiContext.cookies } },
		);
		const classes = (await list.json()) as Array<{ classId: string }>;
		expect(classes.map((row) => row.classId).sort()).toEqual(
			[klass.id, extra.id].sort(),
		);

		const remove = await fetch(
			`${baseURL}/api/meetings/${meeting.id}/classes/${extra.id}`,
			{ method: "DELETE", headers: { Cookie: apiContext.cookies } },
		);
		expect(remove.status).toBe(200);
	});

	test("bloqueia remoção de turma com acompanhamento e edição em finalizada (bordas 9/10)", async ({
		apiContext,
	}) => {
		const klass = await createClass(apiContext, "Turma Com Acompanhamento", "2026");
		const student = await createStudent(apiContext, "Estudante Acompanhado");
		await createEnrollment(apiContext, {
			estudanteId: student.id,
			turmaId: klass.id,
			dataInicio: "2026-01-01",
		});
		const meeting = await createMeeting(apiContext, {
			title: "Reunião Acompanhamento",
			heldAt: "2026-05-10",
			classIds: [klass.id],
			participants: [],
		});
		const start = await transitionMeetingResponse(
			apiContext,
			meeting.id,
			"start",
		);
		expect(start.status).toBe(200);

		const tracked = await fetch(
			`${baseURL}/api/meetings/${meeting.id}/students/${student.id}/status`,
			{
				method: "PATCH",
				headers: {
					Cookie: apiContext.cookies,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ status: "concluido", classId: klass.id }),
			},
		);
		expect(tracked.status).toBe(200);

		const remove = await fetch(
			`${baseURL}/api/meetings/${meeting.id}/classes/${klass.id}`,
			{ method: "DELETE", headers: { Cookie: apiContext.cookies } },
		);
		expect(remove.status).toBe(409);
		expect(await remove.json()).toMatchObject({
			error: "Turma com acompanhamento registrado: não é possível desvincular",
		});

		const finish = await transitionMeetingResponse(
			apiContext,
			meeting.id,
			"finalize",
		);
		expect(finish.status).toBe(200);
		const patch = await fetch(`${baseURL}/api/meetings/${meeting.id}`, {
			method: "PATCH",
			headers: {
				Cookie: apiContext.cookies,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ title: "Título bloqueado" }),
		});
		expect(patch.status).toBe(409);
	});

	test("permite registro independente com reunião finalizada", async ({
		apiContext,
	}) => {
		const klass = await createClass(apiContext, "Turma Independente", "2026");
		const student = await createStudent(apiContext, "Estudante Independente");
		const meeting = await createMeeting(apiContext, {
			title: "Reunião Independente",
			heldAt: "2026-05-10",
			classIds: [klass.id],
			participants: [],
		});
		const setupStart = await transitionMeetingResponse(apiContext, meeting.id, "start");
		expect(setupStart.status).toBe(200);
		const setupFinish = await transitionMeetingResponse(
			apiContext,
			meeting.id,
			"finalize",
		);
		expect(setupFinish.status).toBe(200);
		const record = await createIndependentRecord(
			apiContext,
			student.id,
			"Registro independente pós-fim",
		);
		expect(record).toMatchObject({ texto: "Registro independente pós-fim" });
	});
});
