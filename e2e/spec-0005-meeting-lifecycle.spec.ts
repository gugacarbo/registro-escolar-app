import {
	baseURL,
	createClass,
	createEnrollment,
	createIndependentRecord,
	createLinkedRecord,
	createMeeting,
	createStudent,
	generateMinute,
	reopenMeeting,
	transitionMeetingResponse,
} from "./fixtures/api";
import { expect, test } from "./fixtures/test";

async function getMeeting(ctx: { cookies: string }, meetingId: string) {
	const response = await fetch(`${baseURL}/api/meetings/${meetingId}`, {
		headers: { Cookie: ctx.cookies },
	});
	if (!response.ok) throw new Error(`getMeeting failed: ${response.status}`);
	return (await response.json()) as { id: string; status: string };
}

test.describe("SPEC-0005 ciclo de vida da reunião", () => {
	test("cria reunião aberta pela UI", async ({
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
		await expect(page.getByText("Aberta", { exact: true })).toBeVisible();
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

	test("cria reunião aberta via API", async ({ apiContext }) => {
		const meeting = await createMeeting(apiContext, {
			title: "Conselho Aberto",
			heldAt: "2026-05-10",
			classIds: [],
			participants: [],
		});
		expect(meeting.status).toBe("open");
	});

	test("gera a ata e encerra a reunião (aberta → encerrada)", async ({
		apiContext,
	}) => {
		const klass = await createClass(apiContext, "Turma Ciclo", "2026");
		const meeting = await createMeeting(apiContext, {
			title: "Reunião Ciclo",
			heldAt: "2026-05-10",
			classIds: [klass.id],
			participants: [],
		});

		const generated = await generateMinute(apiContext, meeting.id);
		expect(generated.version).toBe(1);
		expect((await getMeeting(apiContext, meeting.id)).status).toBe("closed");
	});

	test("rejeita gerar nova ata com a reunião encerrada", async ({
		apiContext,
	}) => {
		const klass = await createClass(apiContext, "Turma Já Encerrada", "2026");
		const meeting = await createMeeting(apiContext, {
			title: "Reunião Já Encerrada",
			heldAt: "2026-05-10",
			classIds: [klass.id],
			participants: [],
		});
		await generateMinute(apiContext, meeting.id);

		const response = await fetch(
			`${baseURL}/api/meetings/${meeting.id}/minutes`,
			{ method: "POST", headers: { Cookie: apiContext.cookies } },
		);
		expect(response.status).toBe(409);
		expect(await response.json()).toMatchObject({
			error: "Reunião encerrada: reabra para gerar nova versão da ata",
		});
	});

	test("rejeita reabrir reunião já aberta", async ({ apiContext }) => {
		const klass = await createClass(apiContext, "Turma Já Aberta", "2026");
		const meeting = await createMeeting(apiContext, {
			title: "Reunião Já Aberta",
			heldAt: "2026-05-10",
			classIds: [klass.id],
			participants: [],
		});
		const response = await transitionMeetingResponse(apiContext, meeting.id, "reopen");
		expect(response.status).toBe(409);
	});

	test("bloqueia criar e editar registro vinculado em reunião encerrada", async ({
		apiContext,
	}) => {
		const klass = await createClass(apiContext, "Turma Encerrada", "2026");
		const student = await createStudent(apiContext, "Estudante Encerrado");
		await createEnrollment(apiContext, {
			estudanteId: student.id,
			turmaId: klass.id,
			dataInicio: "2026-01-01",
		});
		const meeting = await createMeeting(apiContext, {
			title: "Reunião Encerrada",
			heldAt: "2026-05-10",
			classIds: [klass.id],
			participants: [],
		});
		const record = await createLinkedRecord(
			apiContext,
			meeting.id,
			student.id,
			"Registro antes do encerramento",
		);
		await generateMinute(apiContext, meeting.id);

		const createResponse = await fetch(
			`${baseURL}/api/meetings/${meeting.id}/students/${student.id}/records`,
			{
				method: "POST",
				headers: { Cookie: apiContext.cookies, "Content-Type": "application/json" },
				body: JSON.stringify({ texto: "Registro depois do encerramento" }),
			},
		);
		expect(createResponse.status).toBe(409);
		expect(await createResponse.json()).toMatchObject({ meetingStatus: "closed" });

		const updateResponse = await fetch(
			`${baseURL}/api/meetings/${meeting.id}/records/${record.id}`,
			{
				method: "PATCH",
				headers: { Cookie: apiContext.cookies, "Content-Type": "application/json" },
				body: JSON.stringify({ texto: "Tentativa de edição" }),
			},
		);
		expect(updateResponse.status).toBe(409);
		expect(await updateResponse.json()).toMatchObject({ meetingStatus: "closed" });
	});

	test("permite registro independente com reunião encerrada", async ({
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
		await generateMinute(apiContext, meeting.id);
		const record = await createIndependentRecord(
			apiContext,
			student.id,
			"Registro independente pós-encerramento",
		);
		expect(record).toMatchObject({
			texto: "Registro independente pós-encerramento",
		});
	});

	test("reabre a reunião encerrada e gera nova versão", async ({ apiContext }) => {
		const klass = await createClass(apiContext, "Turma Reabertura", "2026");
		const meeting = await createMeeting(apiContext, {
			title: "Reunião Reabertura",
			heldAt: "2026-05-10",
			classIds: [klass.id],
			participants: [],
		});

		const first = await generateMinute(apiContext, meeting.id);
		expect(first.version).toBe(1);

		const reopened = await reopenMeeting(apiContext, meeting.id);
		expect(reopened.status).toBe("open");

		const second = await generateMinute(apiContext, meeting.id, "Correção");
		expect(second.version).toBe(2);
		expect((await getMeeting(apiContext, meeting.id)).status).toBe("closed");
	});

	test("edita dados e turmas com a reunião aberta (borda 8)", async ({
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
			status: "open",
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

	test("bloqueia edição de dados com a reunião encerrada", async ({
		apiContext,
	}) => {
		const klass = await createClass(apiContext, "Turma Bloqueio", "2026");
		const meeting = await createMeeting(apiContext, {
			title: "Reunião Bloqueio",
			heldAt: "2026-05-10",
			classIds: [klass.id],
			participants: [],
		});
		await generateMinute(apiContext, meeting.id);

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

	test("bloqueia desvincular turma com acompanhamento (borda 9)", async ({
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
	});

	test("a UI mostra apenas Reabrir quando a reunião está encerrada", async ({
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
		await expect(page.getByText("Aberta", { exact: true })).toBeVisible();
		await expect(
			page.getByRole("button", { name: "Iniciar", exact: true }),
		).toHaveCount(0);
		await expect(
			page.getByRole("button", { name: "Finalizar", exact: true }),
		).toHaveCount(0);

		await generateMinute(apiContext, meeting.id);
		await page.reload();
		await expect(page.getByText("Encerrada", { exact: true })).toBeVisible();

		await page.getByRole("button", { name: "Reabrir", exact: true }).click();
		await page.getByRole("button", { name: "Confirmar reabertura" }).click();
		await expect(page.getByText("Aberta", { exact: true })).toBeVisible();
	});
});
