import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CreateStudentDialog } from "./create-student-dialog";

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
	return render(<CreateStudentDialog open {...props} />, {
		wrapper: createWrapper(),
	});
}

beforeEach(() => {
	vi.unstubAllGlobals();
});

describe("CreateStudentDialog", () => {
	it("renderiza o formulário dentro do dialog quando aberto", async () => {
		renderDialog();

		expect(await screen.findByRole("dialog")).toBeInTheDocument();
		expect(screen.getByText("Novo estudante")).toBeVisible();
		expect(screen.getByLabelText("Nome *")).toBeVisible();
		expect(screen.getByRole("button", { name: "Salvar" })).toBeInTheDocument();
	});

	it("exibe erro de validação quando o nome está vazio", async () => {
		const user = userEvent.setup();
		renderDialog();

		await user.click(screen.getByRole("button", { name: "Salvar" }));

		expect(await screen.findByText("Nome é obrigatório")).toBeVisible();
	});

	it("cria o estudante, fecha o dialog e notifica sucesso", async () => {
		const user = userEvent.setup();
		const onSuccess = vi.fn();
		const fetchMock = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ id: "student-1" }), { status: 201 }),
			);

		function Controlled() {
			const [open, setOpen] = useState(true);
			return (
				<CreateStudentDialog
					open={open}
					onOpenChange={setOpen}
					onSuccess={onSuccess}
				/>
			);
		}

		render(<Controlled />, { wrapper: createWrapper() });

		await user.type(await screen.findByLabelText("Nome *"), "João Silva");
		await user.click(screen.getByRole("button", { name: "Salvar" }));

		await waitFor(() =>
			expect(fetchMock).toHaveBeenCalledWith(
				"/api/students",
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
			new Response(JSON.stringify({ error: "Estudante já existe" }), {
				status: 409,
			}),
		);
		renderDialog();

		await user.type(await screen.findByLabelText("Nome *"), "João Silva");
		await user.click(screen.getByRole("button", { name: "Salvar" }));

		expect(await screen.findByText("Estudante já existe")).toBeVisible();
		expect(screen.getByRole("dialog")).toBeInTheDocument();
	});
});

it("renderiza trigger e controla abertura não controlada", async () => {
	const user = userEvent.setup();
	render(
		<CreateStudentDialog
			trigger={<button type="button">Abrir dialog</button>}
		/>,
		{ wrapper: createWrapper() },
	);
	await user.click(screen.getByRole("button", { name: "Abrir dialog" }));
	expect(await screen.findByRole("dialog")).toBeInTheDocument();
	expect(screen.getByText("Novo estudante")).toBeVisible();
	await user.click(screen.getByRole("button", { name: "Fechar" }));
	await waitFor(() =>
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
	);
});
