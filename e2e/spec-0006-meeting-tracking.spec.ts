import {
	baseURL,
	createClass,
	createEnrollment,
	createMeeting,
	createStudent,
	updateStudentStatus,
} from "./fixtures/api";
import { restoreEnrollmentAsActive } from "./fixtures/db";
import { expect, test, type ApiContext } from "./fixtures/test";

type TrackingStatus = "pendente" | "em_discussao" | "concluido" | "nao_discutido";

async function listMeetingClassStudents(
	ctx: { cookies: string },
	meetingId: string,
	classId: string,
) {
	const response = await fetch(
		`${baseURL}/api/meetings/${meetingId}/classes/${classId}/students`,
		{ headers: { Cookie: ctx.cookies } },
	);
	if (!response.ok) {
		throw new Error(`list students failed: ${response.status}`);
	}
	return (await response.json()) as {
		students: Array<{ studentId: string; name: string; status: TrackingStatus }>;
		counters: Record<TrackingStatus, number> & { total: number };
		nextPendingStudentId: string | null;
	};
}

async function setupStartedMeeting(
	ctx: ApiContext,
	names: string[],
) {
	const klass = await createClass(ctx, `Turma Acompanhamento ${names.length}`, "2026");
	const students = await Promise.all(names.map((name) => createStudent(ctx, name)));
	for (const student of students) {
		await createEnrollment(ctx, {
			estudanteId: student.id,
			turmaId: klass.id,
			dataInicio: "2026-01-01",
		});
	}
	const meeting = await createMeeting(ctx, {
		title: "Reunião Acompanhamento",
		heldAt: "2026-05-10",
		classIds: [klass.id],
		participants: [],
	});
	return { klass, students, meeting };
}

test.describe("SPEC-0006 acompanhamento dos estudantes", () => {
	test("lista somente estudantes vinculados na data e destaca próximo pendente", async ({
		apiContext,
	}) => {
		const active = await createStudent(apiContext, "Estudante Ativo");
		const former = await createStudent(apiContext, "Estudante Antigo");
		const klass = await createClass(apiContext, "Turma Temporal", "2026");
		await createEnrollment(apiContext, {
			estudanteId: former.id,
			turmaId: klass.id,
			dataInicio: "2025-01-01",
			dataTermino: "2026-04-30",
		});
		await createEnrollment(apiContext, {
			estudanteId: active.id,
			turmaId: klass.id,
			dataInicio: "2026-05-01",
		});
		const meeting = await createMeeting(apiContext, {
			title: "Reunião Temporal",
			heldAt: "2026-05-10",
			classIds: [klass.id],
			participants: [],
		});

		const result = await listMeetingClassStudents(apiContext, meeting.id, klass.id);
		expect(result.students.map((student) => student.name)).toEqual(["Estudante Ativo"]);
		expect(result.nextPendingStudentId).toBe(active.id);
	});

	test("avança status pela UI e mantém estado por turma", async ({
		authenticatedPage: page,
		apiContext,
	}) => {
		const { klass, students, meeting } = await setupStartedMeeting(apiContext, [
			"Alice Acompanhamento",
			"Bob Acompanhamento",
		]);
		const otherClass = await createClass(apiContext, "Outra Turma Acompanhamento", "2026");
		const meeting2 = await createMeeting(apiContext, {
			title: "Reunião Outra Turma",
			heldAt: "2026-05-11",
			classIds: [otherClass.id],
			participants: [],
		});

		await page.goto(`/meetings/${meeting.id}/students`);
		await page.getByRole("combobox", { name: "Turma" }).click();
		await page.getByRole("option", { name: klass.name }).last().click();

		await expect(page.getByText("Alice Acompanhamento")).toBeVisible();
		await expect(page.getByText("Bob Acompanhamento")).toBeVisible();
		await page
			.getByRole("button", { name: "Marcar Alice Acompanhamento como Em discussão" })
			.click();
		await expect(page.getByText("0 de 2 concluídos (0%)")).toBeVisible();

		const otherResult = await listMeetingClassStudents(apiContext, meeting2.id, otherClass.id);
		expect(otherResult.students).toHaveLength(0);

		const first = await listMeetingClassStudents(apiContext, meeting.id, klass.id);
		expect(first.students.find((s) => s.studentId === students[0]?.id)?.status).toBe(
			"em_discussao",
		);
		expect(first.students.find((s) => s.studentId === students[1]?.id)?.status).toBe(
			"pendente",
		);
	});

	test("permite concluir sem registros e atinge 100%", async ({
		authenticatedPage: page,
		apiContext,
	}) => {
		const { klass, students, meeting } = await setupStartedMeeting(apiContext, [
			"Único Acompanhamento",
		]);
		await page.goto(`/meetings/${meeting.id}/students`);
		await page.getByRole("combobox", { name: "Turma" }).click();
		await page.getByRole("option", { name: klass.name }).click();
		await page
			.getByRole("button", { name: "Marcar Único Acompanhamento como Concluído" })
			.click();

		await expect(page.getByText("1 de 1 concluídos (100%)")).toBeVisible();
		await expect(page.getByText(/progresso de 100%/)).toBeVisible();

		const result = await listMeetingClassStudents(apiContext, meeting.id, klass.id);
		expect(result.counters.concluido).toBe(1);
		expect(result.counters.total).toBe(1);
		expect(result.nextPendingStudentId).toBeNull();
		expect(students).toHaveLength(1);
	});

	test("marcar não discutido atualiza os contadores", async ({
		authenticatedPage: page,
		apiContext,
	}) => {
		const { klass, meeting } = await setupStartedMeeting(apiContext, [
			"Marcia Não Discutido",
		]);

		await page.goto(`/meetings/${meeting.id}/students`);
		await page.getByRole("combobox", { name: "Turma" }).click();
		await page.getByRole("option", { name: klass.name }).click();

		await expect(page.getByText("0 de 1 concluídos (0%)")).toBeVisible();

		await page
			.getByRole("button", { name: "Marcar Marcia Não Discutido como Concluído" })
			.click();
		await expect(page.getByText("1 de 1 concluídos (100%)")).toBeVisible();

		await page
			.getByRole("button", {
				name: "Marcar Marcia Não Discutido como Não discutido",
			})
			.click();
		await expect(page.getByText("0 de 1 concluídos (0%)")).toBeVisible();

		const result = await listMeetingClassStudents(
			apiContext,
			meeting.id,
			klass.id,
		);
		expect(result.students[0]?.status).toBe("nao_discutido");
		expect(result.counters.nao_discutido).toBe(1);
		expect(result.counters.concluido).toBe(0);
	});

	test("independência de status por turma na mesma reunião", async ({
		apiContext,
	}) => {
		const student = await createStudent(apiContext, "Estudante Independência Status");
		const classA = await createClass(apiContext, "Turma Independência A", "2026");
		const classB = await createClass(apiContext, "Turma Independência B", "2026");
		const enrollmentA = await createEnrollment(apiContext, {
			estudanteId: student.id,
			turmaId: classA.id,
			dataInicio: "2026-01-01",
		});
		await createEnrollment(apiContext, {
			estudanteId: student.id,
			turmaId: classB.id,
			dataInicio: "2026-01-01",
		});
		// A API encerra o vínculo anterior (regra de transferência); restauramos
		// o vínculo histórico no banco isolado para testar as duas turmas juntas.
		restoreEnrollmentAsActive(enrollmentA.enrollment.id);

		const meeting = await createMeeting(apiContext, {
			title: "Reunião Status Independente",
			heldAt: "2026-05-10",
			classIds: [classA.id, classB.id],
			participants: [],
		});

		await updateStudentStatus(
			apiContext,
			meeting.id,
			student.id,
			"concluido",
			classA.id,
		);

		const statusA = await listMeetingClassStudents(apiContext, meeting.id, classA.id);
		const statusB = await listMeetingClassStudents(apiContext, meeting.id, classB.id);
		expect(statusA.students.find((s) => s.studentId === student.id)?.status).toBe(
			"concluido",
		);
		expect(statusB.students.find((s) => s.studentId === student.id)?.status).toBe(
			"pendente",
		);
	});

	test("trata o mesmo estudante em duas turmas da reunião de forma independente", async ({
		apiContext,
	}) => {
		const student = await createStudent(apiContext, "Estudante Duas Turmas");
		const first = await createClass(apiContext, "Primeira Turma Dupla", "2026");
		const second = await createClass(apiContext, "Segunda Turma Dupla", "2026");
		const firstEnrollment = await createEnrollment(apiContext, {
			estudanteId: student.id,
			turmaId: first.id,
			dataInicio: "2026-01-01",
		});
		await createEnrollment(apiContext, {
			estudanteId: student.id,
			turmaId: second.id,
			dataInicio: "2026-01-01",
		});
		// A API aplica a semântica de transferência da SPEC-0002 ao criar o
		// segundo vínculo. Esta spec exige o mesmo estudante simultaneamente em duas
		// turmas da mesma reunião, então restauramos o vínculo histórico no banco
		// isolado sem alterar a regra de transferência.
		restoreEnrollmentAsActive(
			firstEnrollment.enrollment.id,
		);
		const meeting = await createMeeting(apiContext, {
			title: "Reunião Duas Turmas",
			heldAt: "2026-05-10",
			classIds: [first.id, second.id],
			participants: [],
		});

		await updateStudentStatus(apiContext, meeting.id, student.id, "concluido", first.id);
		const firstResult = await listMeetingClassStudents(apiContext, meeting.id, first.id);
		const secondResult = await listMeetingClassStudents(apiContext, meeting.id, second.id);
		expect(firstResult.students[0]?.status).toBe("concluido");
		expect(secondResult.students[0]?.status).toBe("pendente");
	});
});
