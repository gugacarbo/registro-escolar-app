import {
	baseURL,
	createClass,
	createEnrollment,
	createStudent,
} from "./fixtures/api";
import { expect, test } from "./fixtures/test";
import { ClassesPage } from "./pages/classes-page";

test.describe("SPEC-0002 turmas e matrículas", () => {
	test("cria e lista turmas pela UI", async ({
		authenticatedPage: page,
	}) => {
		const classesPage = new ClassesPage(page);
		await classesPage.create("Turma E2E", "2026");

		await expect.poll(async () => page.url()).toBe(`${baseURL}/classes`);
		await expect(page.getByText("Turma E2E — 2026")).toBeVisible();
	});

	test("abre os alunos da turma ao clicar na linha", async ({
		authenticatedPage: page,
		apiContext,
	}) => {
		const klass = await createClass(apiContext, "Turma Linha Clicável", "2026");

		const classesPage = new ClassesPage(page);
		await classesPage.goto();
		const cell = page.getByRole("cell", { name: "Turma Linha Clicável" });
		await expect(cell).toBeVisible();
		await cell.click();
		await expect(page).toHaveURL(
			new RegExp(`/classes/${klass.id}/students`),
		);
		await expect(
			page.getByRole("heading", { name: "Alunos da turma" }),
		).toBeVisible();
	});

	test("trata turmas equivalentes de períodos distintos como entidades distintas", async ({
		apiContext,
	}) => {
		const first = await createClass(apiContext, "9º Ano", "2025");
		const second = await createClass(apiContext, "9º Ano", "2026");
		expect(first.id).not.toBe(second.id);

		const response = await fetch(`${baseURL}/api/classes`, {
			headers: { Cookie: apiContext.cookies },
		});
		const classes = (await response.json()) as Array<{ id: string }>;
		expect(classes.filter((c) => c.id === first.id || c.id === second.id)).toHaveLength(2);
	});

	test("matricula aluno pela UI e lista vínculo na data", async ({
		authenticatedPage: page,
		apiContext,
	}) => {
		const student = await createStudent(apiContext, "Aluno Matrícula");
		const klass = await createClass(apiContext, "Turma Matrícula", "2026");

		await page.goto("/classes/enroll");
		await page.getByRole("combobox").first().click();
		const studentOption = page.locator('[data-slot="select-item"]').filter({ hasText: student.name });
		await expect(studentOption).toBeAttached();
		await studentOption.click();
		await page.getByRole("combobox").nth(1).click();
		const classOption = page.locator('[data-slot="select-item"]').filter({ hasText: "Turma Matrícula — 2026" });
		await expect(classOption).toBeAttached();
		await classOption.click();
		await page.locator("input[type=date]").first().fill("2026-03-01");
		await page.getByRole("button", { name: "Matricular" }).click();

		await expect(page.getByText("Aluno Matrícula — ativa")).toBeVisible();
		await expect(page).toHaveURL(new RegExp(`/classes/${klass.id}/students`));
	});

	test("transferência encerra vínculo anterior e preserva histórico", async ({
		apiContext,
	}) => {
		const student = await createStudent(apiContext, "Aluno Transferido");
		const first = await createClass(apiContext, "Turma Origem", "2026");
		const second = await createClass(apiContext, "Turma Destino", "2026");

		await createEnrollment(apiContext, {
			alunoId: student.id,
			turmaId: first.id,
			dataInicio: "2026-01-01",
		});
		const transfer = await createEnrollment(apiContext, {
			alunoId: student.id,
			turmaId: second.id,
			dataInicio: "2026-07-01",
		});
		expect(transfer.closedEnrollments).toHaveLength(1);

		const oldResponse = await fetch(
			`${baseURL}/api/classes/${first.id}/students?date=2026-08-01`,
			{ headers: { Cookie: apiContext.cookies } },
		);
		expect(await oldResponse.json()).toHaveLength(0);

		const historyResponse = await fetch(
			`${baseURL}/api/classes/${first.id}/students?date=2026-06-01`,
			{ headers: { Cookie: apiContext.cookies } },
		);
		const history = (await historyResponse.json()) as Array<{
			student: { id: string };
			enrollment: { status: string };
		}>;
		expect(history).toHaveLength(1);
		expect(history[0]?.student.id).toBe(student.id);
		expect(history[0]?.enrollment.status).toBe("transferida");
	});

	test("não inclui aluno fora do intervalo do vínculo", async ({
		apiContext,
	}) => {
		const student = await createStudent(apiContext, "Aluno Temporal");
		const klass = await createClass(apiContext, "Turma Temporal", "2026");
		await createEnrollment(apiContext, {
			alunoId: student.id,
			turmaId: klass.id,
			dataInicio: "2026-02-01",
			dataTermino: "2026-06-30",
		});

		const response = await fetch(
			`${baseURL}/api/classes/${klass.id}/students?date=2026-08-01`,
			{ headers: { Cookie: apiContext.cookies } },
		);
		expect(await response.json()).toHaveLength(0);
	});

	test("rejeita vínculos sobrepostos na mesma turma", async ({
		apiContext,
	}) => {
		const student = await createStudent(apiContext, "Aluno Sobreposto");
		const klass = await createClass(apiContext, "Turma Sobreposta", "2026");
		await createEnrollment(apiContext, {
			alunoId: student.id,
			turmaId: klass.id,
			dataInicio: "2026-01-01",
		});

		const response = await fetch(`${baseURL}/api/enrollments`, {
			method: "POST",
			headers: { Cookie: apiContext.cookies, "Content-Type": "application/json" },
			body: JSON.stringify({
				alunoId: student.id,
				turmaId: klass.id,
				dataInicio: "2026-03-01",
			}),
		});
		expect(response.status).toBe(409);
	});

	test("mantém vínculo sem término ativo em data futura", async ({
		apiContext,
	}) => {
		const student = await createStudent(apiContext, "Aluno Aberto");
		const klass = await createClass(apiContext, "Turma Aberta", "2026");
		await createEnrollment(apiContext, {
			alunoId: student.id,
			turmaId: klass.id,
			dataInicio: "2026-01-01",
		});

		const response = await fetch(
			`${baseURL}/api/classes/${klass.id}/students?date=2026-12-31`,
			{ headers: { Cookie: apiContext.cookies } },
		);
		const rows = (await response.json()) as Array<{ student: { id: string } }>;
		expect(rows.map((row) => row.student.id)).toContain(student.id);
	});
});
