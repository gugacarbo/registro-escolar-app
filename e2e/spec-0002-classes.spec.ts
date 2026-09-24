import {
	baseURL,
	createClass,
	createEnrollment,
	createStudent,
} from "./fixtures/api";
import { expect, test } from "./fixtures/test";
import { ClassesPage } from "./pages/classes-page";
import { gotoReady } from "./pages/navigation";

test.describe("SPEC-0002 turmas e matrículas", () => {
	test("cria e lista turmas pela UI", async ({
		authenticatedPage: page,
	}) => {
		const classesPage = new ClassesPage(page);
		await classesPage.create("Turma E2E", "2026");

		await expect.poll(async () => page.url()).toBe(`${baseURL}/classes`);
		await expect(page.getByRole("row", { name: /Turma E2E/ })).toBeVisible();
	});

	test("filtra turmas por período letivo", async ({
		authenticatedPage: page,
		apiContext,
	}) => {
		await createClass(apiContext, "Turma Filtro 2025", "2025");
		await createClass(apiContext, "Turma Filtro 2026", "2026");

		const classesPage = new ClassesPage(page);
		await classesPage.goto();
		await expect(page.getByRole("heading", { name: "Turmas" })).toBeVisible();
		await expect(page.getByRole("row", { name: /Turma Filtro 2025/ })).toBeVisible();
		await expect(page.getByRole("row", { name: /Turma Filtro 2026/ })).toBeVisible();
		await expect(page.getByRole("link", { name: "Ofertas" })).toHaveCount(2);
		await page
			.getByRole("row", { name: /Turma Filtro 2025/ })
			.getByRole("link", { name: "Ofertas" })
			.click();
		await expect(page).toHaveURL(/\/classes\/[^/]+\/offers$/);
		await page.goBack();
		await expect(page.getByRole("heading", { name: "Turmas" })).toBeVisible();

		await page.getByRole("combobox", { name: "Filtrar por período letivo" }).click();
		await page.getByRole("option", { name: "2025", exact: true }).click();
		await expect(page.getByRole("row", { name: /Turma Filtro 2025/ })).toBeVisible();
		await expect(page.getByRole("row", { name: /Turma Filtro 2026/ })).toHaveCount(0);
	});

	test("abre os estudantes da turma ao clicar na linha", async ({
		authenticatedPage: page,
		apiContext,
	}) => {
		const klass = await createClass(apiContext, "Turma Linha Clicável", "2026");

		const classesPage = new ClassesPage(page);
		await classesPage.goto();
		const cell = page.getByRole("cell", {
			name: "Turma Linha Clicável",
			exact: true,
		});
		await expect(cell).toBeVisible();
		await cell.click();
		await expect(page).toHaveURL(
			new RegExp(`/classes/${klass.id}/students`),
		);
		await expect(
			page.getByRole("heading", { name: "Turma Linha Clicável" }),
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
		const classes = (await response.json()) as {
			data: Array<{ id: string }>;
		};
		expect(
			classes.data.filter((c) => c.id === first.id || c.id === second.id),
		).toHaveLength(2);
	});

	test("matricula estudante pela UI e lista vínculo na data", async ({
		authenticatedPage: page,
		apiContext,
	}) => {
		const student = await createStudent(apiContext, "Estudante Matrícula");
		const klass = await createClass(apiContext, "Turma Matrícula", "2026");

		await gotoReady(page,"/classes/enroll");
		await page.getByRole("combobox", { name: "Estudante" }).click();
		const studentOption = page.getByRole("option", {
			name: student.name,
			exact: true,
		});
		await expect(studentOption).toBeVisible();
		await studentOption.click();
		await page.getByRole("combobox", { name: "Turma" }).click();
		const classOption = page.getByRole("option", {
			name: "Turma Matrícula — 2026",
			exact: true,
		});
		await expect(classOption).toBeVisible();
		await classOption.click();
		await page.locator("input[type=date]").first().fill("2026-03-01");
		await page.getByRole("button", { name: "Matricular" }).click();

		const row = page.getByRole("row").filter({ hasText: "Estudante Matrícula" });
		await expect(row).toContainText("Ativa");
		await expect(page).toHaveURL(new RegExp(`/classes/${klass.id}/students`));
	});

	test("transferência encerra vínculo anterior e preserva histórico", async ({
		apiContext,
	}) => {
		const student = await createStudent(apiContext, "Estudante Transferido");
		const first = await createClass(apiContext, "Turma Origem", "2026");
		const second = await createClass(apiContext, "Turma Destino", "2026");

		await createEnrollment(apiContext, {
			estudanteId: student.id,
			turmaId: first.id,
			dataInicio: "2026-01-01",
		});
		const transfer = await createEnrollment(apiContext, {
			estudanteId: student.id,
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

	test("não inclui estudante fora do intervalo do vínculo", async ({
		apiContext,
	}) => {
		const student = await createStudent(apiContext, "Estudante Temporal");
		const klass = await createClass(apiContext, "Turma Temporal", "2026");
		await createEnrollment(apiContext, {
			estudanteId: student.id,
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
		const student = await createStudent(apiContext, "Estudante Sobreposto");
		const klass = await createClass(apiContext, "Turma Sobreposta", "2026");
		await createEnrollment(apiContext, {
			estudanteId: student.id,
			turmaId: klass.id,
			dataInicio: "2026-01-01",
		});

		const response = await fetch(`${baseURL}/api/enrollments`, {
			method: "POST",
			headers: { Cookie: apiContext.cookies, "Content-Type": "application/json" },
			body: JSON.stringify({
				estudanteId: student.id,
				turmaId: klass.id,
				dataInicio: "2026-03-01",
			}),
		});
		expect(response.status).toBe(409);
	});

	test("mantém vínculo sem término ativo em data futura", async ({
		apiContext,
	}) => {
		const student = await createStudent(apiContext, "Estudante Aberto");
		const klass = await createClass(apiContext, "Turma Aberta", "2026");
		await createEnrollment(apiContext, {
			estudanteId: student.id,
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
