import {
	baseURL,
	createClass,
	createEnrollment,
	createGeneralReport,
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
	studentId: string | null;
	studentName: string | null;
	metadata: Record<string, string | null>;
};

async function getClassHistory(apiContext: ApiContext, classId: string, query = "") {
	const response = await fetch(`${baseURL}/api/classes/${classId}/history${query}`, {
		headers: { Cookie: apiContext.cookies },
	});
	if (!response.ok) throw new Error(`class history failed: ${response.status}`);
	return (await response.json()) as {
		turma: { id: string; name: string; academicPeriod: string };
		alunos: Array<{ studentId: string; name: string; status: string; endDate: string | null }>;
		reunioes: Array<{ id: string; title: string; status: string }>;
		eventos: HistoryEvent[];
	};
}

test.describe("SPEC-0012 histórico da turma", () => {
	test("turma sem reuniões retorna alunos e estado vazio de eventos", async ({
		apiContext,
	}) => {
		const klass = await createClass(apiContext, "Turma Sem Reuniões", "2026");
		const student = await createStudent(apiContext, "Aluno Sem Reuniões");
		await createEnrollment(apiContext, {
			alunoId: student.id,
			turmaId: klass.id,
			dataInicio: "2026-01-01",
		});

		const history = await getClassHistory(apiContext, klass.id);
		expect(history.turma.id).toBe(klass.id);
		expect(history.reunioes).toHaveLength(0);
		expect(history.eventos).toHaveLength(0);
		expect(history.alunos.map((row) => row.studentId)).toContain(student.id);
	});

	test("inclui alunos históricos com status e data de término", async ({
		apiContext,
	}) => {
		const klass = await createClass(apiContext, "Turma Históricos", "2026");
		const former = await createStudent(apiContext, "Aluno Histórico Turma");
		const active = await createStudent(apiContext, "Aluno Ativo Turma");
		await createEnrollment(apiContext, {
			alunoId: former.id,
			turmaId: klass.id,
			dataInicio: "2026-01-01",
			dataTermino: "2026-06-30",
			status: "concluida",
		});
		await createEnrollment(apiContext, {
			alunoId: active.id,
			turmaId: klass.id,
			dataInicio: "2026-07-01",
		});

		const history = await getClassHistory(apiContext, klass.id);
		const formerRow = history.alunos.find((row) => row.studentId === former.id);
		expect(formerRow?.status).toBe("concluida");
		expect(formerRow?.endDate).not.toBeNull();
		expect(history.alunos.find((row) => row.studentId === active.id)?.status).toBe("ativa");
	});

	test("busca sem resultados retorna eventos vazios", async ({ apiContext }) => {
		const klass = await createClass(apiContext, "Turma Busca Vazia", "2026");
		const history = await getClassHistory(apiContext, klass.id, "?q=nenhum");
		expect(history.eventos).toHaveLength(0);
	});

	test("aplica filtros de período, aluno e texto", async ({ apiContext }) => {
		const klass = await createClass(apiContext, "Turma Filtros Histórico", "2026");
		const student = await createStudent(apiContext, "Aluno Filtro Turma");
		await createEnrollment(apiContext, {
			alunoId: student.id,
			turmaId: klass.id,
			dataInicio: "2026-01-01",
		});
		const meeting = await createMeeting(apiContext, {
			title: "Reunião Filtro Turma",
			heldAt: "2026-05-10",
			classIds: [klass.id],
			participants: [],
		});
		await startMeeting(apiContext, meeting.id);
		await createLinkedRecord(apiContext, meeting.id, student.id, "Registro filtros turma");

		const byPeriod = await getClassHistory(apiContext, klass.id, "?periodo=2026");
		expect(byPeriod.eventos.map((event) => event.texto)).toContain("Registro filtros turma");

		const wrongPeriod = await getClassHistory(apiContext, klass.id, "?periodo=2025");
		expect(wrongPeriod.eventos).toHaveLength(0);

		const byStudent = await getClassHistory(apiContext, klass.id, `?alunoId=${student.id}`);
		expect(byStudent.eventos.map((event) => event.studentId)).toContain(student.id);

		const byText = await getClassHistory(apiContext, klass.id, "?q=FILTROS");
		expect(byText.eventos.map((event) => event.texto)).toContain("Registro filtros turma");
	});

	test("não mistura registros de turma equivalente de outro período", async ({
		apiContext,
	}) => {
		const first = await createClass(apiContext, "Turma Equivalente", "2025");
		const second = await createClass(apiContext, "Turma Equivalente", "2026");
		const student = await createStudent(apiContext, "Aluno Equivalente");
		const meeting = await createMeeting(apiContext, {
			title: "Reunião Equivalente",
			heldAt: "2026-05-10",
			classIds: [second.id],
			participants: [],
		});
		await startMeeting(apiContext, meeting.id);
		await createLinkedRecord(apiContext, meeting.id, student.id, "Registro equivalente 2026");

		const firstHistory = await getClassHistory(apiContext, first.id);
		const secondHistory = await getClassHistory(apiContext, second.id);
		expect(firstHistory.eventos).toHaveLength(0);
		expect(secondHistory.eventos.map((event) => event.texto)).toContain("Registro equivalente 2026");
	});

	test("mantém registro interno visível no histórico", async ({ apiContext }) => {
		const klass = await createClass(apiContext, "Turma Interno Histórico", "2026");
		const student = await createStudent(apiContext, "Aluno Interno Turma");
		const meeting = await createMeeting(apiContext, {
			title: "Reunião Interno Turma",
			heldAt: "2026-05-10",
			classIds: [klass.id],
			participants: [],
		});
		await startMeeting(apiContext, meeting.id);
		await createLinkedRecord(apiContext, meeting.id, student.id, "Registro interno turma", {
			incluirNaAta: false,
		});
		await createGeneralReport(apiContext, meeting.id, "Relato interno turma", {
			incluirNaAta: false,
		});

		const history = await getClassHistory(apiContext, klass.id);
		expect(history.eventos.map((event) => event.texto)).toContain("Registro interno turma");
		expect(history.eventos.map((event) => event.texto)).toContain("Relato interno turma");
		expect(history.eventos.filter((event) => event.interno).length).toBeGreaterThanOrEqual(2);
	});
});
