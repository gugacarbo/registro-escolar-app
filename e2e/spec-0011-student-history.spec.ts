import {
	baseURL,
	createClass,
	createComponent,
	createEnrollment,
	createIndependentRecord,
	createLinkedRecord,
	createMeeting,
	createStudent,
	startMeeting,
} from "./fixtures/api";
import { expect, test, type ApiContext } from "./fixtures/test";

type HistoryEvent = {
	id: string;
	tipo: string;
	data: string;
	turmaId: string | null;
	turmaNome: string | null;
	reuniaoId: string | null;
	reuniaoTitulo: string | null;
	texto: string | null;
	interno: boolean;
	metadata: Record<string, string | null>;
};

async function getStudentHistory(
	apiContext: ApiContext,
	studentId: string,
	query = "",
) {
	const response = await fetch(
		`${baseURL}/api/students/${studentId}/history${query}`,
		{ headers: { Cookie: apiContext.cookies } },
	);
	if (!response.ok) throw new Error(`history failed: ${response.status}`);
	return (await response.json()) as {
		aluno: { id: string; name: string };
		eventos: HistoryEvent[];
	};
}

test.describe("SPEC-0011 histórico do aluno", () => {
	test("inclui eventos de duas turmas na mesma linha histórica", async ({
		apiContext,
	}) => {
		const student = await createStudent(apiContext, "Aluno Histórico");
		const first = await createClass(apiContext, "História Turma 2025", "2025");
		const second = await createClass(apiContext, "História Turma 2026", "2026");
		await createEnrollment(apiContext, {
			alunoId: student.id,
			turmaId: first.id,
			dataInicio: "2026-01-01",
			dataTermino: "2026-12-31",
		});
		await createEnrollment(apiContext, {
			alunoId: student.id,
			turmaId: second.id,
			dataInicio: "2026-01-01",
		});

		const history = await getStudentHistory(apiContext, student.id);
		expect(history.aluno.name).toBe("Aluno Histórico");
		expect(history.eventos.length).toBeGreaterThan(0);
		expect(history.eventos.map((event) => event.turmaId)).toEqual(
			expect.arrayContaining([first.id, second.id]),
		);
	});

	test("filtro sem resultados retorna lista vazia", async ({ apiContext }) => {
		const student = await createStudent(apiContext, "Aluno Sem Resultado");
		const history = await getStudentHistory(
			apiContext,
			student.id,
			"?q=termo-inexistente",
		);
		expect(history.eventos).toHaveLength(0);
	});

	test("busca textual ignora acento e caixa", async ({ apiContext }) => {
		const student = await createStudent(apiContext, "Aluno Busca");
		const klass = await createClass(apiContext, "Turma Busca", "2026");
		const meeting = await createMeeting(apiContext, {
			title: "Reunião Busca",
			heldAt: "2026-05-10",
			classIds: [klass.id],
			participants: [],
		});
		await startMeeting(apiContext, meeting.id);
		await createLinkedRecord(
			apiContext,
			meeting.id,
			student.id,
			"Performance excepcional",
		);
		const history = await getStudentHistory(apiContext, student.id, "?q=PERFORMANCE");
		expect(history.eventos.map((event) => event.texto)).toContain(
			"Performance excepcional",
		);
	});

	test("inclui registro interno no histórico", async ({ apiContext }) => {
		const student = await createStudent(apiContext, "Aluno Interno");
		const klass = await createClass(apiContext, "Turma Histórico Interno", "2026");
		const meeting = await createMeeting(apiContext, {
			title: "Reunião Interno",
			heldAt: "2026-05-10",
			classIds: [klass.id],
			participants: [],
		});
		await startMeeting(apiContext, meeting.id);
		await createLinkedRecord(apiContext, meeting.id, student.id, "Registro interno histórico", {
			incluirNaAta: false,
		});

		const history = await getStudentHistory(apiContext, student.id);
		const internal = history.eventos.find(
			(event) => event.texto === "Registro interno histórico",
		);
		expect(internal?.interno).toBe(true);
	});

	test("filtros por turma, período, reunião e componente funcionam", async ({
		apiContext,
	}) => {
		const student = await createStudent(apiContext, "Aluno Filtros");
		const first = await createClass(apiContext, "Filtro Turma A", "2025");
		const second = await createClass(apiContext, "Filtro Turma B", "2026");
		await createEnrollment(apiContext, {
			alunoId: student.id,
			turmaId: first.id,
			dataInicio: "2026-01-01",
			dataTermino: "2026-12-31",
		});
		await createEnrollment(apiContext, {
			alunoId: student.id,
			turmaId: second.id,
			dataInicio: "2026-01-01",
		});
		const meeting = await createMeeting(apiContext, {
			title: "Reunião Filtros",
			heldAt: "2026-05-10",
			classIds: [second.id],
			participants: [],
		});
		await startMeeting(apiContext, meeting.id);
		const component = await createComponent(apiContext, "História Componente");
		await createLinkedRecord(apiContext, meeting.id, student.id, "Registro com componente", {
			componenteId: component.id,
		});
		await createLinkedRecord(apiContext, meeting.id, student.id, "Registro com categoria", {
			categoriaId: "categoria-historico",
		});
		await createIndependentRecord(apiContext, student.id, "Registro independente componente", {
			turmaId: second.id,
			componenteId: component.id,
		});

		const byClass = await getStudentHistory(
			apiContext,
			student.id,
			`?turmaId=${second.id}`,
		);
		expect(byClass.eventos.every((event) => event.turmaId === second.id)).toBe(true);

		const byPeriod = await getStudentHistory(
			apiContext,
			student.id,
			"?periodo=2025",
		);
		expect(byPeriod.eventos.map((event) => event.turmaNome)).toContain(
			"Filtro Turma A",
		);
		expect(byPeriod.eventos.map((event) => event.turmaNome)).not.toContain(
			"Filtro Turma B",
		);

		const byMeeting = await getStudentHistory(
			apiContext,
			student.id,
			`?reuniaoId=${meeting.id}`,
		);
		expect(byMeeting.eventos.map((event) => event.texto)).toContain(
			"Registro com componente",
		);

		const byComponent = await getStudentHistory(
			apiContext,
			student.id,
			`?componenteId=${component.id}`,
		);
		expect(byComponent.eventos.map((event) => event.texto)).toContain(
			"Registro independente componente",
		);

		const byCategory = await getStudentHistory(
			apiContext,
			student.id,
			"?categoriaId=categoria-historico",
		);
		expect(byCategory.eventos.map((event) => event.texto)).toContain(
			"Registro com categoria",
		);
	});

	test("relaciona reunião anterior ao contexto da turma na data", async ({
		apiContext,
	}) => {
		const student = await createStudent(apiContext, "Aluno Contexto Antigo");
		const oldClass = await createClass(apiContext, "Turma Contexto Antiga", "2026");
		await createEnrollment(apiContext, {
			alunoId: student.id,
			turmaId: oldClass.id,
			dataInicio: "2026-01-01",
			dataTermino: "2026-12-31",
		});
		const meeting = await createMeeting(apiContext, {
			title: "Reunião Antiga",
			heldAt: "2026-06-15",
			classIds: [oldClass.id],
			participants: [],
		});
		await startMeeting(apiContext, meeting.id);
		await createLinkedRecord(apiContext, meeting.id, student.id, "Registro antigo contextualizado");

		const history = await getStudentHistory(apiContext, student.id);
		const oldEvent = history.eventos.find(
			(event) => event.texto === "Registro antigo contextualizado",
		);
		expect(oldEvent).toMatchObject({
			turmaId: oldClass.id,
			turmaNome: "Turma Contexto Antiga",
			reuniaoId: meeting.id,
			reuniaoTitulo: "Reunião Antiga",
		});
	});
});
