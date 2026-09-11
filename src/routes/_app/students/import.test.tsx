import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	useImportPreview: vi.fn(),
	useResolveImport: vi.fn(),
	useNavigate: vi.fn(),
	mutateAsync: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => () => ({}),
	useNavigate: mocks.useNavigate,
}));

vi.mock("#/hooks/students/use-import-students", () => ({
	useImportPreview: mocks.useImportPreview,
	useResolveImport: mocks.useResolveImport,
}));

import ImportStudentsPage from "./import";

function renderPage() {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	return render(
		<QueryClientProvider client={client}>
			<ImportStudentsPage />
		</QueryClientProvider>,
	);
}

beforeEach(() => {
	mocks.mutateAsync.mockReset();
	mocks.mutateAsync.mockResolvedValue({
		rows: [],
		summary: { total: 0, valid: 0, conflicts: 0, invalid: 0 },
	});
	mocks.useImportPreview.mockReturnValue({
		mutateAsync: mocks.mutateAsync,
		isPending: false,
		error: null,
		data: undefined,
	});
	mocks.useResolveImport.mockReturnValue({
		mutateAsync: mocks.mutateAsync,
		isPending: false,
		error: null,
		data: undefined,
	});
	mocks.useNavigate.mockReturnValue(vi.fn());
});

describe("ImportStudentsPage", () => {
	it("exibe o botão Selecionar arquivo e mantém o input oculto", () => {
		renderPage();

		expect(
			screen.getByRole("button", { name: "Selecionar arquivo" }),
		).toBeInTheDocument();
		const input = screen.getByLabelText("Selecionar arquivo para importar");
		expect(input).toHaveAttribute("type", "file");
		expect(input).toHaveAttribute("accept", ".csv,.xlsx,.xls,.ods");
		expect(input).toHaveClass("hidden");
	});

	it("clicar em Selecionar arquivo chama click no input oculto", async () => {
		renderPage();

		const input = screen.getByLabelText(
			"Selecionar arquivo para importar",
		) as HTMLInputElement;
		const spy = vi.spyOn(input, "click");
		const user = userEvent.setup();

		await user.click(
			screen.getByRole("button", { name: "Selecionar arquivo" }),
		);

		expect(spy).toHaveBeenCalledTimes(1);
		spy.mockRestore();
	});

	it("submete o arquivo selecionado e exibe o nome dele", async () => {
		renderPage();

		const input = screen.getByLabelText(
			"Selecionar arquivo para importar",
		) as HTMLInputElement;
		const file = new File(["a,b"], "estudantes.csv", {
			type: "text/csv",
		});
		act(() => {
			fireEvent.change(input, { target: { files: [file] } });
		});
		await screen.findByText("estudantes.csv");

		expect(mocks.mutateAsync).toHaveBeenCalledWith(file);
	});

	it("mantém o título do passo de upload", () => {
		renderPage();

		expect(screen.getByText("Importar estudantes")).toBeInTheDocument();
	});
});
