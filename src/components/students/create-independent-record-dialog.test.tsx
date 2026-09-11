import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CreateIndependentRecordDialog } from "./create-independent-record-dialog";

vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn() },
}));

function createWrapper() {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	return function Wrapper({ children }: { children: ReactNode }) {
		return (
			<QueryClientProvider client={client}>{children}</QueryClientProvider>
		);
	};
}

function renderDialog() {
	return render(<CreateIndependentRecordDialog studentId="student-1" open />, {
		wrapper: createWrapper(),
	});
}

function mockRecordFetch(status = 201) {
	return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
		const url = String(input);
		if (url.startsWith("/api/students/student-1/records")) {
			return new Response(
				JSON.stringify({
					id: "record-1",
					studentId: "student-1",
					error: "Registro rejeitado",
				}),
				{ status },
			);
		}
		return new Response(JSON.stringify({ data: [], total: 0 }), {
			status: 200,
		});
	});
}

beforeEach(() => {
	vi.mocked(toast.success).mockReset();
	vi.mocked(toast.error).mockReset();
});

describe("CreateIndependentRecordDialog", () => {
	it("renderiza o formulário dentro do dialog quando aberto", async () => {
		mockRecordFetch();
		renderDialog();

		expect(
			await screen.findByRole("dialog", { name: "Novo registro" }),
		).toBeInTheDocument();
		expect(screen.getByLabelText("Texto *")).toBeVisible();
		expect(screen.getByLabelText("Turma")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Criar registro" }),
		).toBeInTheDocument();
		expect(screen.getByLabelText("Incluir na ata")).toBeChecked();
	});

	it("exibe erro de validação quando o texto está vazio", async () => {
		const user = userEvent.setup();
		mockRecordFetch();
		renderDialog();

		await user.click(
			await screen.findByRole("button", { name: "Criar registro" }),
		);

		expect(await screen.findByText("Texto é obrigatório")).toBeVisible();
		expect(toast.success).not.toHaveBeenCalled();
	});

	it("cria o registro, notifica sucesso e fecha o dialog", async () => {
		const user = userEvent.setup();
		mockRecordFetch();

		function Controlled() {
			const [open, setOpen] = useState(true);
			return (
				<CreateIndependentRecordDialog
					studentId="student-1"
					open={open}
					onOpenChange={setOpen}
				/>
			);
		}

		render(<Controlled />, { wrapper: createWrapper() });

		await user.type(await screen.findByLabelText("Texto *"), "Foco em frações");
		await user.click(screen.getByRole("button", { name: "Criar registro" }));

		await waitFor(() =>
			expect(toast.success).toHaveBeenCalledWith("Registro criado"),
		);
		await waitFor(() =>
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
		);
	});

	it("envia os campos opcionais como nulos quando não preenchidos", async () => {
		const user = userEvent.setup();
		const fetchMock = mockRecordFetch();
		renderDialog();

		await user.type(await screen.findByLabelText("Texto *"), "Nota breve");
		await user.click(screen.getByRole("button", { name: "Criar registro" }));

		await waitFor(() =>
			expect(
				fetchMock.mock.calls.some(([url]) =>
					String(url).startsWith("/api/students/student-1/records"),
				),
			).toBe(true),
		);
		const recordsCall = fetchMock.mock.calls.find(([url]) =>
			String(url).startsWith("/api/students/student-1/records"),
		);
		expect(JSON.parse((recordsCall![1] as RequestInit).body as string)).toEqual(
			{
				texto: "Nota breve",
				turmaId: null,
				categoriaId: null,
				componenteId: null,
				incluirNaAta: true,
			},
		);
	});

	it("exibe erro do servidor com toast e mantém o dialog aberto", async () => {
		const user = userEvent.setup();
		mockRecordFetch(422);
		renderDialog();

		await user.type(await screen.findByLabelText("Texto *"), "Texto com erro");
		await user.click(screen.getByRole("button", { name: "Criar registro" }));

		await waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith("Registro rejeitado"),
		);
		expect(screen.getByRole("dialog")).toBeInTheDocument();
		expect(screen.getByLabelText("Texto *")).toHaveValue("Texto com erro");
	});
});
