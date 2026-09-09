import {
	baseURL,
	createClass,
	createEnrollment,
	createIndependentRecord,
	createLinkedRecord,
	createMeeting,
	createStaff,
	createStudent,
	setRecordInclusion,
	startMeeting,
	transitionMeetingResponse,
} from "./fixtures/api";
import { expect, test, type ApiContext } from "./fixtures/test";

async function setupMeetingWithStudent(
	apiContext: ApiContext,
	title: string,
) {
	const klass = await createClass(apiContext, `Turma Registros ${title}`, "2026");
	const student = await createStudent(apiContext, `Aluno ${title}`);
	await createEnrollment(apiContext, {
		alunoId: student.id,
		turmaId: klass.id,
		dataInicio: "2026-01-01",
	});
	const meeting = await createMeeting(apiContext, {
		title: `Reunião ${title}`,
		heldAt: "2026-05-10",
		classIds: [klass.id],
		participants: [],
	});
	await startMeeting(apiContext, meeting.id);
	return { klass, student, meeting };
}

async function listRecords(
	ctx: { cookies: string },
	meetingId: string,
	studentId: string,
) {
	const response = await fetch(
		`${baseURL}/api/meetings/${meetingId}/students/${studentId}/records`,
		{ headers: { Cookie: ctx.cookies } },
	);
	if (!response.ok) throw new Error(`list records failed: ${response.status}`);
	const body = (await response.json()) as {
		records: Array<{
			id: string;
			texto: string;
			scope: "vinculado" | "contexto";
			includeInMinutes: boolean;
		}>;
	};
	return body.records;
}

test.describe("SPEC-0007 registros de aluno", () => {
	test("rejeita texto vazio nos dois fluxos", async ({ apiContext }) => {
		const student = await createStudent(apiContext, "Aluno Texto Vazio");
		const independent = await fetch(`${baseURL}/api/students/${student.id}/records`, {
			method: "POST",
			headers: { Cookie: apiContext.cookies, "Content-Type": "application/json" },
			body: JSON.stringify({ texto: "" }),
		});
		expect(independent.status).toBe(400);

		const { meeting } = await setupMeetingWithStudent(apiContext, "Texto Vazio");
		const linked = await fetch(
			`${baseURL}/api/meetings/${meeting.id}/students/${student.id}/records`,
			{
				method: "POST",
				headers: { Cookie: apiContext.cookies, "Content-Type": "application/json" },
				body: JSON.stringify({ texto: "" }),
			},
		);
		expect(linked.status).toBe(400);
	});

	test("rejeita origem não participante", async ({ apiContext }) => {
		const { meeting, student } = await setupMeetingWithStudent(apiContext, "Origem");
		const outsider = await createStaff(apiContext, "Servidor Não Participante");
		const response = await fetch(
			`${baseURL}/api/meetings/${meeting.id}/students/${student.id}/records`,
			{
				method: "POST",
				headers: { Cookie: apiContext.cookies, "Content-Type": "application/json" },
				body: JSON.stringify({ texto: "Registro", origemId: outsider.id }),
			},
		);
		expect(response.status).toBe(422);
	});

	test("mantém múltiplos registros e armazena interno", async ({ apiContext }) => {
		const { meeting, student } = await setupMeetingWithStudent(apiContext, "Múltiplos");
		const texts = ["Primeiro", "Segundo", "Terceiro", "Quarto"];
		for (const texto of texts) {
			await createLinkedRecord(apiContext, meeting.id, student.id, texto);
		}
		const internal = await createLinkedRecord(apiContext, meeting.id, student.id, "Interno", {
			incluirNaAta: false,
		});
		const records = await listRecords(apiContext, meeting.id, student.id);
		expect(records.filter((record) => texts.includes(record.texto))).toHaveLength(4);
		expect(records.find((record) => record.id === internal.id)?.includeInMinutes).toBe(false);
	});

	test("exibe contexto independente apenas da turma da reunião", async ({ apiContext }) => {
		const includedClass = await createClass(apiContext, "Turma Contexto Incluída", "2026");
		const excludedClass = await createClass(apiContext, "Turma Contexto Excluída", "2026");
		const student = await createStudent(apiContext, "Aluno Contexto");
		await createEnrollment(apiContext, {
			alunoId: student.id,
			turmaId: includedClass.id,
			dataInicio: "2026-01-01",
		});
		const meeting = await createMeeting(apiContext, {
			title: "Reunião Contexto",
			heldAt: "2026-05-10",
			classIds: [includedClass.id],
			participants: [],
		});
		await startMeeting(apiContext, meeting.id);
		const included = await createIndependentRecord(
			apiContext,
			student.id,
			"Contexto incluído",
			{ turmaId: includedClass.id },
		);
		await createIndependentRecord(apiContext, student.id, "Contexto excluído", {
			turmaId: excludedClass.id,
		});

		const records = await listRecords(apiContext, meeting.id, student.id);
		const texts = records.map((record) => record.texto);
		expect(texts).toContain("Contexto incluído");
		expect(texts).not.toContain("Contexto excluído");
		expect(records.find((record) => record.id === included.id)?.scope).toBe("contexto");
	});

	test("toggle de inclusão por reunião preserva registro original", async ({ apiContext }) => {
		const { klass, student, meeting } = await setupMeetingWithStudent(apiContext, "Inclusão");
		const record = await createIndependentRecord(apiContext, student.id, "Contexto toggle", {
			turmaId: klass.id,
		});
		const first = await setRecordInclusion(apiContext, meeting.id, student.id, record.id, false);
		expect(first).toMatchObject({ include: false });

		const records = await listRecords(apiContext, meeting.id, student.id);
		const linkedRecord = records.find((item) => item.id === record.id);
		expect(linkedRecord?.includeInMinutes).toBe(false);
		expect(linkedRecord?.texto).toBe("Contexto toggle");

		const restored = await setRecordInclusion(
			apiContext,
			meeting.id,
			student.id,
			record.id,
			true,
		);
		expect(restored).toMatchObject({ include: true });
		const restoredRecords = await listRecords(apiContext, meeting.id, student.id);
		expect(
			restoredRecords.find((item) => item.id === record.id)?.includeInMinutes,
		).toBe(true);
		expect(
			restoredRecords.find((item) => item.id === record.id)?.texto,
		).toBe("Contexto toggle");

		expect(records.find((item) => item.id === record.id)?.texto).toBe("Contexto toggle");
	});

	test("edita registro vinculado enquanto em andamento e rejeita após finalizar", async ({
		apiContext,
	}) => {
		const { meeting, student } = await setupMeetingWithStudent(apiContext, "Edição");
		const record = await createLinkedRecord(apiContext, meeting.id, student.id, "Original");
		const update = await fetch(`${baseURL}/api/meetings/${meeting.id}/records/${record.id}`, {
			method: "PATCH",
			headers: { Cookie: apiContext.cookies, "Content-Type": "application/json" },
			body: JSON.stringify({ texto: "Editado" }),
		});
		expect(update.status).toBe(200);

		const finish = await transitionMeetingResponse(apiContext, meeting.id, "finalize");
		expect(finish.status).toBe(200);
		const rejected = await fetch(`${baseURL}/api/meetings/${meeting.id}/records/${record.id}`, {
			method: "PATCH",
			headers: { Cookie: apiContext.cookies, "Content-Type": "application/json" },
			body: JSON.stringify({ texto: "Depois do fim" }),
		});
		expect(rejected.status).toBe(409);
	});
});
