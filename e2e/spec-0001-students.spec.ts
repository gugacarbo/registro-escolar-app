import { expect, test } from "./fixtures/test";
import {
	adminApiRequest,
	baseURL,
	createClass,
	createEnrollment,
	createStudent,
} from "./fixtures/api";
import { StudentsPage } from "./pages/students-page";
import { gotoReady } from "./pages/navigation";

test.describe("SPEC-0001 cadastro e importação de estudantes", () => {
	test("exige autenticação para acessar estudantes", async ({ page }) => {
		await gotoReady(page,"/students");
		await expect(
			page.getByText("Acesse o Registro Escolar com sua conta."),
		).toBeVisible();
	});

	test("cadastra estudante manualmente pela UI", async ({
		authenticatedPage: page,
		apiContext,
	}) => {
		const studentsPage = new StudentsPage(page);
		await studentsPage.create("Estudante Manual E2E");

		await expect(page.getByRole("dialog")).toBeHidden({ timeout: 10_000 });
		await expect.poll(async () => page.url()).toBe(`${baseURL}/students`);
		await expect(page.getByText("Estudante Manual E2E")).toBeVisible();
		const response = await fetch(`${baseURL}/api/students`, {
			headers: { Cookie: apiContext.cookies },
		});
		const body = (await response.json()) as {
			data: Array<{ name: string }>;
			total: number;
		};
		expect(
			body.data.some((student) => student.name === "Estudante Manual E2E"),
		).toBe(true);
	});

	test("filtra estudantes pela busca e pagina o resultado", async ({
		authenticatedPage: page,
		apiContext,
	}) => {
		const seed = "Estudante Paginado E2E";
		for (let i = 1; i <= 11; i++) {
			await fetch(`${baseURL}/api/students`, {
				method: "POST",
				headers: {
					Cookie: apiContext.cookies,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ name: `${seed} ${i}` }),
			});
		}

		const studentsPage = new StudentsPage(page);
		await studentsPage.goto();
		await page
			.getByLabel("Buscar por nome ou documento")
			.fill("Estudante Paginado E2E");

		await expect(page.getByText("Mostrando 1–10 de 11")).toBeVisible();
		await expect(
			page.getByRole("link", { name: `${seed} 11`, exact: true }),
		).toBeVisible();
		await page.getByRole("navigation", { name: "pagination" }).getByRole("link", { name: "2" }).click();
		await expect(page.getByText("Mostrando 11–11 de 11")).toBeVisible();
	});

	test("filtra pela turma e exibe as turmas ativas na tabela", async ({
		authenticatedPage: page,
		apiContext,
	}) => {
		const turma = await createClass(apiContext, "Turma Filtro E2E", "2026.1");
		const matriculado = await createStudent(apiContext, "Aluno Filtro Turma E2E");
		await createEnrollment(apiContext, {
			estudanteId: matriculado.id,
			turmaId: turma.id,
			dataInicio: "2026-02-01",
		});
		await createStudent(apiContext, "Aluno Sem Turma E2E");

		const studentsPage = new StudentsPage(page);
		await studentsPage.goto();
		await page.getByRole("combobox", { name: "Filtrar por turma" }).click();
		await page
			.getByRole("option", { name: "Turma Filtro E2E", exact: true })
			.click();

		await expect(page.getByText("Mostrando 1–1 de 1")).toBeVisible();
		await expect(
			page
				.getByRole("row", { name: /Aluno Filtro Turma E2E/ })
				.getByText("Turma Filtro E2E"),
		).toBeVisible();
		await expect(page.getByText("Aluno Sem Turma E2E")).not.toBeVisible();
	});

	test("abre o detalhe ao clicar em qualquer lugar da linha", async ({
		authenticatedPage: page,
		apiContext,
	}) => {
		const student = await createStudent(apiContext, "Estudante Linha Clicável");

		const studentsPage = new StudentsPage(page);
		await studentsPage.goto();
		await page
			.getByLabel("Buscar por nome ou documento")
			.fill("Estudante Linha Clicável");

		const cell = page.getByRole("row", { name: /Estudante Linha Clicável/ });
		await expect(cell).toBeVisible();
		await cell.click();
		await expect(page).toHaveURL(new RegExp(`/students/${student.id}`));
		await expect(
			page.getByRole("heading", { name: "Estudante Linha Clicável" }),
		).toBeVisible();
	});

	test("mostra no detalhe os dados compactos, vínculos e linha do tempo", async ({
		authenticatedPage: page,
		apiContext,
	}) => {
		const student = await createStudent(apiContext, "Estudante Detalhe E2E", {
			document: "11122233",
			email: "detalhe@example.com",
			phone: "11 98888-7777",
		});
		const turma = await createClass(apiContext, "Turma Detalhe E2E", "2026.1");
		await createEnrollment(apiContext, {
			estudanteId: student.id,
			turmaId: turma.id,
			dataInicio: "2026-02-01",
		});

		await gotoReady(page,`/students/${student.id}`);
		await expect(
			page.getByRole("heading", { name: "Dados do estudante" }),
		).toBeVisible();
		await expect(page.getByText("11122233", { exact: true }).first()).toBeVisible();
		await expect(page.getByText("detalhe@example.com", { exact: true }).first()).toBeVisible();
		await expect(page.getByText("11 98888-7777", { exact: true }).first()).toBeVisible();
		await expect(
			page.getByRole("heading", { name: "Turmas" }),
		).toBeVisible();
		await expect(
			page.getByRole("link", { name: "Turma Detalhe E2E" }),
		).toBeVisible();
		await expect(page.getByText(/Início 01\/02\/2026 · Em andamento/)).toBeVisible();
		await expect(
			page.getByRole("heading", { name: "Linha do tempo" }),
		).toBeVisible();
		await expect(page.getByRole("button", { name: "Editar" })).toBeVisible();

		await page.getByRole("button", { name: "Editar" }).click();
		await expect(
			page.getByRole("button", { name: "Salvar alterações" }),
		).toBeVisible();
	});

	test("rejeita nome vazio no cadastro manual", async ({
		authenticatedPage: page,
	}) => {
		const studentsPage = new StudentsPage(page);
		await studentsPage.goto();
		await studentsPage.clickNew();
		await studentsPage.submit();

		await expect(page.getByText("Nome é obrigatório")).toBeVisible();
	});

	test("importa CSV válido e cria estudantes", async ({
		authenticatedPage: page,
		apiContext,
	}) => {
		await gotoReady(page,"/students/import");
		const csv = "nome,documento\nAlice Import,1234567\nBob Import,7654321\n";
		await page.setInputFiles("input[type=file]", {
			name: "estudantes.csv",
			mimeType: "text/csv",
			buffer: Buffer.from(csv, "utf8"),
		});

		await expect(page.getByText("Revisar importação")).toBeVisible();
		await expect(page.getByText("Alice Import")).toBeVisible();
		await page.getByRole("button", { name: "Confirmar importação" }).click();
		await expect(page.getByText("Importação concluída")).toBeVisible();
		await expect(page.getByText(/Criados: 2/)).toBeVisible();

		const response = await fetch(
			`${baseURL}/api/students?search=Import&pageSize=100`,
			{
				headers: { Cookie: apiContext.cookies },
			},
		);
		const body = (await response.json()) as {
			data: Array<{ name: string }>;
		};
		expect(body.data.filter((s) => s.name.includes("Import"))).toHaveLength(2);
	});

	test("mostra conflito e vincula estudante existente", async ({
		authenticatedPage: page,
		apiContext,
	}) => {
		const existing = (await (
			await fetch(`${baseURL}/api/students`, {
				method: "POST",
				headers: {
					Cookie: apiContext.cookies,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ name: "Conflito E2E", document: "9990001" }),
			})
		).json()) as { id: string; name: string };

		await gotoReady(page,"/students/import");
		const csv = "nome,documento\nConflito E2E,9990001\n";
		await page.setInputFiles("input[type=file]", {
			name: "conflito.csv",
			mimeType: "text/csv",
			buffer: Buffer.from(csv, "utf8"),
		});

		await expect(page.getByText("Revisar importação")).toBeVisible();
		await expect(page.getByRole("cell", { name: "Conflito", exact: true })).toBeVisible();
		await expect(page.getByLabel("Estudante existente")).toBeVisible();
		await page.getByRole("button", { name: "Confirmar importação" }).click();
		await expect(page.getByText(/Vinculados: 1/)).toBeVisible();

		const response = await fetch(
			`${baseURL}/api/students?search=Conflito E2E&pageSize=100`,
			{
				headers: { Cookie: apiContext.cookies },
			},
		);
		const body = (await response.json()) as {
			data: Array<{ id: string }>;
		};
		expect(
			body.data.filter((student) => student.id === existing.id),
		).toHaveLength(1);
	});

	test("rejeita arquivo com formato inválido", async ({
		authenticatedPage: page,
	}) => {
		await gotoReady(page,"/students/import");
		await page.setInputFiles("input[type=file]", {
			name: "arquivo.txt",
			mimeType: "text/plain",
			buffer: Buffer.from("nome\nAlice\n", "utf8"),
		});

		await expect(page.getByText("Falha ao processar arquivo")).toBeVisible();
	});

	test("busca estudantes por documento na tela", async ({
		authenticatedPage: page,
		apiContext,
	}) => {
		const student = await createStudent(apiContext, "Estudante Documento Busca", {
			document: "DOC-9876",
		});

		const studentsPage = new StudentsPage(page);
		await studentsPage.goto();
		await page.getByLabel("Buscar por nome ou documento").fill("DOC-9876");

		await expect(
			page.getByRole("row", { name: /Estudante Documento Busca/ }),
		).toBeVisible();
		await expect(page.getByText("Mostrando 1–1 de 1")).toBeVisible();
		expect(student.id).toBeTruthy();
	});

	test("rejeita criação manual duplicada com 409", async ({ apiContext }) => {
		// O matching de duplicidade compara o nome normalizado (minúsculas)
		// com igualdade exata, então o nome de referência já nasce normalizado.
		const name = "estudante duplicado 409";
		const first = await adminApiRequest("POST", "/api/students", apiContext.cookies, {
			name,
		});
		expect(first.status).toBe(201);

		const second = await adminApiRequest("POST", "/api/students", apiContext.cookies, {
			name,
		});
		expect(second.status).toBe(409);
	});

	test("lista linhas inválidas na pré-visualização", async ({
		authenticatedPage: page,
	}) => {
		await gotoReady(page,"/students/import");
		const csv = "nome,documento\nAlice Válida,1001\n,1002\nNome Obrigatório,\n";
		await page.setInputFiles("input[type=file]", {
			name: "invalidas.csv",
			mimeType: "text/csv",
			buffer: Buffer.from(csv, "utf8"),
		});

		await expect(page.getByText("Revisar importação")).toBeVisible();
		await expect(page.getByText(/Inválidos: 2/)).toBeVisible();
		await expect(page.getByText("Nome é obrigatório").first()).toBeVisible();
	});
});
