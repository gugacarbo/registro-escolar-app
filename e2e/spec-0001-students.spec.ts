import { expect, test } from "./fixtures/test";
import { baseURL } from "./fixtures/api";
import { StudentsPage } from "./pages/students-page";

test.describe("SPEC-0001 cadastro e importação de alunos", () => {
	test("exige autenticação para acessar alunos", async ({ page }) => {
		await page.goto("/students");
		await expect(
			page.getByText("Acesse o Registro Escolar com sua conta."),
		).toBeVisible();
	});

	test("cadastra aluno manualmente pela UI", async ({
		authenticatedPage: page,
		apiContext,
	}) => {
		const studentsPage = new StudentsPage(page);
		await studentsPage.create("Aluno Manual E2E");

		await expect(page.getByRole("dialog")).toBeHidden({ timeout: 10_000 });
		await expect.poll(async () => page.url()).toBe(`${baseURL}/students`);
		await expect(page.getByText("Aluno Manual E2E")).toBeVisible();
		const response = await fetch(`${baseURL}/api/students`, {
			headers: { Cookie: apiContext.cookies },
		});
		const students = (await response.json()) as Array<{ name: string }>;
		expect(students.some((student) => student.name === "Aluno Manual E2E")).toBe(
			true,
		);
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

	test("importa CSV válido e cria alunos", async ({
		authenticatedPage: page,
		apiContext,
	}) => {
		await page.goto("/students/import");
		const csv = "nome,documento\nAlice Import,1234567\nBob Import,7654321\n";
		await page.setInputFiles("input[type=file]", {
			name: "alunos.csv",
			mimeType: "text/csv",
			buffer: Buffer.from(csv, "utf8"),
		});

		await expect(page.getByText("Revisar importação")).toBeVisible();
		await expect(page.getByText("Alice Import")).toBeVisible();
		await page.getByRole("button", { name: "Confirmar importação" }).click();
		await expect(page.getByText("Importação concluída")).toBeVisible();
		await expect(page.getByText(/Criados: 2/)).toBeVisible();

		const response = await fetch(`${baseURL}/api/students`, {
			headers: { Cookie: apiContext.cookies },
		});
		const students = (await response.json()) as Array<{ name: string }>;
		expect(students.filter((s) => s.name.includes("Import"))).toHaveLength(2);
	});

	test("mostra conflito e vincula aluno existente", async ({
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

		await page.goto("/students/import");
		const csv = "nome,documento\nConflito E2E,9990001\n";
		await page.setInputFiles("input[type=file]", {
			name: "conflito.csv",
			mimeType: "text/csv",
			buffer: Buffer.from(csv, "utf8"),
		});

		await expect(page.getByText("Revisar importação")).toBeVisible();
		await expect(page.getByRole("cell", { name: "Conflito", exact: true })).toBeVisible();
		await expect(page.getByLabel("Aluno existente")).toBeVisible();
		await page.getByRole("button", { name: "Confirmar importação" }).click();
		await expect(page.getByText(/Vinculados: 1/)).toBeVisible();

		const response = await fetch(`${baseURL}/api/students`, {
			headers: { Cookie: apiContext.cookies },
		});
		const students = (await response.json()) as Array<{ id: string }>;
		expect(students.filter((student) => student.id === existing.id)).toHaveLength(
			1,
		);
	});

	test("rejeita arquivo com formato inválido", async ({
		authenticatedPage: page,
	}) => {
		await page.goto("/students/import");
		await page.setInputFiles("input[type=file]", {
			name: "arquivo.txt",
			mimeType: "text/plain",
			buffer: Buffer.from("nome\nAlice\n", "utf8"),
		});

		await expect(page.getByText("Falha ao processar arquivo")).toBeVisible();
	});

	test("lista linhas inválidas na pré-visualização", async ({
		authenticatedPage: page,
	}) => {
		await page.goto("/students/import");
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
