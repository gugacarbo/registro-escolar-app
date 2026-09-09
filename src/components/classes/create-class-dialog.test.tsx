import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CreateClassDialog } from "./create-class-dialog";

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

function renderDialog(props?: { open?: boolean }) {
	return render(<CreateClassDialog open {...props} />, {
		wrapper: createWrapper(),
	});
}

beforeEach(() => {
	vi.unstubAllGlobals();
});

describe("CreateClassDialog", () => {
	it("renderiza o formulário dentro do dialog quando aberto", async () => {
		renderDialog();

		expect(await screen.findByRole("dialog")).toBeInTheDocument();
		expect(screen.getByText("Nova turma")).toBeVisible();
		expect(screen.getByLabelText("Nome *")).toBeVisible();
		expect(
			screen.getByLabelText("Período letivo *"),
		).toBeVisible();
		expect(screen.getByRole("button", { name: "Salvar" })).toBeInTheDocument();
	});

	it("exibe erro de validação quando os campos obrigatórios estão vazios", async () => {
		const user = userEvent.setup();
		renderDialog();

		await user.click(screen.getByRole("button", { name: "Salvar" }));

		expect(await screen.findByText("Nome é obrigatório")).toBeVisible();
		expect(
			await screen.findByText("Período letivo é obrigatório"),
		).toBeVisible();
	});

	it("cria a turma, fecha o dialog e notifica sucesso", async () => {
		const user = userEvent.setup();
		const onSuccess = vi.fn();
		const fetchMock = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ id: "class-1" }), { status: 201 }),
			);

		function Controlled() {
			const [open, setOpen] = useState(true);
			return (
				<CreateClassDialog
					open={open}
					onOpenChange={setOpen}
					onSuccess={onSuccess}
				/>
			);
		}

		render(<Controlled />, { wrapper: createWrapper() });

		await user.type(await screen.findByLabelText("Nome *"), "9º Ano A");
		await user.type(await screen.findByLabelText("Período letivo *"), "2026");
		await user.click(screen.getByRole("button", { name: "Salvar" }));

		await waitFor(() =>
			expect(fetchMock).toHaveBeenCalledWith(
				"/api/classes",
				expect.objectContaining({ method: "POST" }),
			),
		);
		await waitFor(() =>
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
		);
		expect(onSuccess).toHaveBeenCalled();
	});

	it("exibe erro vindo do servidor sem fechar o dialog", async () => {
		const user = userEvent.setup();
		vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
			new Response(JSON.stringify({ error: "Turma já existe" }), {
				status: 409,
			}),
		);
		renderDialog();

		await user.type(await screen.findByLabelText("Nome *"), "9º Ano A");
		await user.type(await screen.findByLabelText("Período letivo *"), "2026");
		await user.click(screen.getByRole("button", { name: "Salvar" }));

		expect(await screen.findByText("Turma já existe")).toBeVisible();
		expect(screen.getByRole("dialog")).toBeInTheDocument();
	});
});
