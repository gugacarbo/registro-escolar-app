import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StudentDetail } from "#/lib/students/types";

const mocks = vi.hoisted(() => ({
	useStudent: vi.fn(),
	useStudentHistory: vi.fn(),
	mutateAsync: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => () => ({
		useParams: () => ({ id: "student-1" }),
	}),
	Link: ({
		children,
		to,
		...rest
	}: { children: React.ReactNode; to: string } & Record<string, unknown>) => (
		<a href={to} {...rest}>
			{children}
		</a>
	),
}));

vi.mock("#/hooks/students/use-student", () => ({
	useStudent: mocks.useStudent,
}));

vi.mock("#/hooks/students/use-update-student", () => ({
	useUpdateStudent: () => ({ mutateAsync: mocks.mutateAsync }),
}));

vi.mock("#/hooks/history/use-history", () => ({
	useStudentHistory: mocks.useStudentHistory,
}));

import StudentDetailPage from "./$id";

// A API serializa datas como string (JSON); o type do Drizzle diz Date.
const ISO = {
	birthDate: "2010-05-20T00:00:00.000Z",
	createdAt: "2026-01-01T12:00:00.000Z",
	updatedAt: "2026-01-01T12:00:00.000Z",
} as const;

function makeStudent(overrides: Partial<StudentDetail> = {}): StudentDetail {
	return {
		id: "student-1",
		name: "João da Silva",
		document: "123.456.789-00",
		registrationNumber: "MAT-001",
		email: "joao@example.com",
		phone: "11 99999-0000",
		birthDate: ISO.birthDate as unknown as Date,
		notes: "Observações do estudante",
		createdAt: ISO.createdAt as unknown as Date,
		updatedAt: ISO.updatedAt as unknown as Date,
		matriculas: [],
		...overrides,
	};
}

function renderPage() {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(
		<QueryClientProvider client={client}>
			<StudentDetailPage />
		</QueryClientProvider>,
	);
}

beforeEach(() => {
	mocks.mutateAsync.mockReset();
	mocks.mutateAsync.mockResolvedValue(makeStudent());
	mocks.useStudentHistory.mockReturnValue({
		data: {
			estudante: { id: "student-1", name: "João da Silva" },
			eventos: [],
		},
		isLoading: false,
		isError: false,
	});
	mocks.useStudent.mockReturnValue({
		data: makeStudent(),
		isLoading: false,
		isError: false,
		error: null,
	});
});

describe("StudentDetailPage", () => {
	it("exibe esqueletos de carregamento enquanto a query está pendente", () => {
		mocks.useStudent.mockReturnValue({
			data: undefined,
			isLoading: true,
			isError: false,
			error: null,
		});
		renderPage();

		expect(
			screen.getByRole("heading", { name: "Estudante" }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("heading", { name: "Dados do estudante" }),
		).not.toBeInTheDocument();
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});

	it("exibe mensagem de erro quando a consulta falha", () => {
		mocks.useStudent.mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: true,
			error: new Error("Estudante não encontrado"),
		});
		renderPage();

		expect(screen.getByRole("alert")).toHaveTextContent(
			"Estudante não encontrado",
		);
	});

	it("exibe mensagem genérica quando o erro não é instância de Error", () => {
		mocks.useStudent.mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: true,
			error: "Falha inesperada" as unknown as Error,
		});
		renderPage();

		expect(screen.getByRole("alert")).toHaveTextContent(
			"Falha ao carregar o estudante",
		);
	});

	it("exibe traços quando os campos opcionais estão vazios", () => {
		mocks.useStudent.mockReturnValue({
			data: makeStudent({
				document: null,
				registrationNumber: null,
				email: null,
				phone: null,
				birthDate: null,
				notes: null,
			}),
			isLoading: false,
			isError: false,
			error: null,
		});
		renderPage();

		// Documento, Matrícula, Email, Telefone e Nascimento sem valor.
		expect(screen.getAllByText("—")).toHaveLength(5);
		expect(screen.queryByText("Observações")).not.toBeInTheDocument();
		// Sem resumo no header, "Nascimento" aparece só no detalhe.
		expect(screen.getAllByText("Nascimento")).toHaveLength(1);
	});

	it("formata datas a partir de instâncias Date", () => {
		mocks.useStudent.mockReturnValue({
			data: makeStudent({
				birthDate: new Date("2010-05-20T12:00:00Z"),
				createdAt: new Date("2026-01-01T12:00:00Z"),
				updatedAt: new Date("2026-01-02T15:30:00Z"),
			}),
			isLoading: false,
			isError: false,
			error: null,
		});
		renderPage();

		expect(screen.getAllByText("20/05/2010")).toHaveLength(2);
		expect(screen.getByText(/Registro em 01\/01\/2026/)).toBeInTheDocument();
		expect(screen.getByText(/Atualizado em 02\/01\/2026/)).toBeInTheDocument();
	});

	it("submete campos vazios como nulos", async () => {
		const user = userEvent.setup();
		mocks.useStudent.mockReturnValue({
			data: makeStudent({
				document: null,
				registrationNumber: null,
				email: null,
				phone: null,
				birthDate: null,
				notes: null,
			}),
			isLoading: false,
			isError: false,
			error: null,
		});
		renderPage();

		await user.click(screen.getByRole("button", { name: "Editar" }));
		await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

		expect(mocks.mutateAsync).toHaveBeenCalledWith({
			name: "João da Silva",
			document: null,
			registrationNumber: null,
			email: null,
			phone: null,
			birthDate: null,
			notes: null,
		});
	});

	it("exibe os dados do estudante em formato compacto", () => {
		renderPage();

		expect(
			screen.getByRole("heading", { name: "João da Silva" }),
		).toBeInTheDocument();
		// Documento/Matrícula/Nascimento aparecem no resumo do header e no
		// detalhe da seção de dados, por isso getAllByText.
		expect(screen.getAllByText("Documento")).toHaveLength(2);
		expect(screen.getAllByText("123.456.789-00")).toHaveLength(2);
		expect(screen.getAllByText("MAT-001")).toHaveLength(2);
		expect(screen.getAllByText("20/05/2010")).toHaveLength(2);
		expect(screen.getByText("joao@example.com")).toBeInTheDocument();
		expect(screen.getByText("11 99999-0000")).toBeInTheDocument();
		expect(screen.getByText("Observações do estudante")).toBeInTheDocument();
		expect(screen.getByText(/Registro em 01\/01\/2026/)).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: "Linha do tempo" }),
		).toBeInTheDocument();
	});

	it("exibe os vínculos de turma com período e status", () => {
		mocks.useStudent.mockReturnValue({
			data: makeStudent({
				matriculas: [
					{
						id: "class-1",
						name: "7º A",
						startDate: "2026-02-01T00:00:00.000Z",
						endDate: null,
						status: "ativa",
					},
					{
						id: "class-2",
						name: "6º B",
						startDate: "2025-02-01T00:00:00.000Z",
						endDate: "2025-06-30T00:00:00.000Z",
						status: "encerrada",
					},
				],
			}),
			isLoading: false,
			isError: false,
			error: null,
		});
		renderPage();

		expect(screen.getByRole("heading", { name: "Turmas" })).toBeInTheDocument();
		expect(screen.getByText("7º A")).toBeInTheDocument();
		expect(
			screen.getByText(/Início 01\/02\/2026 · Em andamento/),
		).toBeInTheDocument();
		expect(screen.getByText("6º B")).toBeInTheDocument();
		expect(
			screen.getByText(/Início 01\/02\/2025 · Fim 30\/06\/2025/),
		).toBeInTheDocument();
		expect(screen.getByText("Ativa")).toBeInTheDocument();
		expect(screen.getByText("Encerrada")).toBeInTheDocument();
	});

	it("exibe estado vazio de turmas com ação de matrícula", () => {
		renderPage();

		expect(screen.getByText("Nenhuma turma vinculada")).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Matricular na turma" }),
		).toBeInTheDocument();
	});

	it("preenche o formulário ao abrir o modo de edição", async () => {
		const user = userEvent.setup();
		renderPage();

		await user.click(screen.getByRole("button", { name: "Editar" }));

		expect(screen.getByLabelText("Nome *")).toHaveValue("João da Silva");
		expect(screen.getByLabelText("Documento")).toHaveValue("123.456.789-00");
		expect(screen.getByLabelText("Email")).toHaveValue("joao@example.com");
		expect(screen.getByLabelText("Telefone")).toHaveValue("11 99999-0000");
		expect(
			screen.getByRole("button", { name: "Salvar alterações" }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Editar" }),
		).not.toBeInTheDocument();
	});

	it("submete a atualização, confirma e volta ao modo de exibição", async () => {
		const user = userEvent.setup();
		mocks.mutateAsync.mockResolvedValue(makeStudent());
		renderPage();

		await user.click(screen.getByRole("button", { name: "Editar" }));
		await user.clear(screen.getByLabelText("Nome *"));
		await user.type(screen.getByLabelText("Nome *"), "João Souza");
		await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

		expect(mocks.mutateAsync).toHaveBeenCalledWith({
			name: "João Souza",
			document: "123.456.789-00",
			registrationNumber: "MAT-001",
			email: "joao@example.com",
			phone: "11 99999-0000",
			birthDate: "2010-05-20",
			notes: "Observações do estudante",
		});
		expect(await screen.findByText("Estudante atualizado")).toBeInTheDocument();
		expect(screen.queryByLabelText("Nome *")).not.toBeInTheDocument();
	});

	it("cancela a edição sem salvar", async () => {
		const user = userEvent.setup();
		renderPage();

		await user.click(screen.getByRole("button", { name: "Editar" }));
		await user.clear(screen.getByLabelText("Nome *"));
		await user.type(screen.getByLabelText("Nome *"), "Nome Alterado");
		await user.click(screen.getByRole("button", { name: "Cancelar" }));

		expect(screen.queryByLabelText("Nome *")).not.toBeInTheDocument();
		expect(mocks.mutateAsync).not.toHaveBeenCalled();
		expect(
			screen.getByRole("heading", { name: "João da Silva" }),
		).toBeInTheDocument();
	});

	it("exibe erro do servidor quando a atualização falha", async () => {
		const user = userEvent.setup();
		mocks.mutateAsync.mockRejectedValue(new Error("Falha ao salvar"));
		renderPage();

		await user.click(screen.getByRole("button", { name: "Editar" }));
		await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

		expect(await screen.findByText("Falha ao salvar")).toBeInTheDocument();
		expect(screen.getByLabelText("Nome *")).toBeInTheDocument();
	});
});
