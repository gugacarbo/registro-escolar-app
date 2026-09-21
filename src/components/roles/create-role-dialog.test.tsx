import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CreateRoleDialog } from "./create-role-dialog";

const mocks = vi.hoisted(() => ({
	toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("sonner", () => ({ toast: mocks.toast }));

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
	return render(<CreateRoleDialog open {...props} />, {
		wrapper: createWrapper(),
	});
}

beforeEach(() => {
	vi.unstubAllGlobals();
	mocks.toast.success.mockReset();
});

describe("CreateRoleDialog", () => {
	it("renderiza o formulário dentro do dialog quando aberto", async () => {
		renderDialog();

		expect(await screen.findByRole("dialog")).toBeInTheDocument();
		expect(screen.getByText("Novo cargo")).toBeVisible();
		expect(screen.getByLabelText("Nome *")).toBeVisible();
		expect(screen.getByRole("button", { name: "Salvar" })).toBeInTheDocument();
	});

	it("cria o cargo, fecha o dialog e notifica sucesso", async () => {
		const user = userEvent.setup();
		const onSuccess = vi.fn();
		const fetchMock = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ id: "role-1" }), { status: 201 }),
			);

		function Controlled() {
			const [open, setOpen] = useState(true);
			return (
				<CreateRoleDialog
					open={open}
					onOpenChange={setOpen}
					onSuccess={onSuccess}
				/>
			);
		}

		render(<Controlled />, { wrapper: createWrapper() });

		await user.type(await screen.findByLabelText("Nome *"), "Professor");
		await user.click(screen.getByRole("button", { name: "Salvar" }));

		await waitFor(() =>
			expect(fetchMock).toHaveBeenCalledWith(
				"/api/roles",
				expect.objectContaining({ method: "POST" }),
			),
		);
		await waitFor(() =>
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
		);
		expect(onSuccess).toHaveBeenCalled();
		expect(mocks.toast.success).toHaveBeenCalledWith("Cargo cadastrado");
	});

	it("exibe erro vindo do servidor sem fechar o dialog", async () => {
		const user = userEvent.setup();
		vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
			new Response(JSON.stringify({ error: "Cargo já existe" }), {
				status: 409,
			}),
		);
		renderDialog();

		await user.type(await screen.findByLabelText("Nome *"), "Professor");
		await user.click(screen.getByRole("button", { name: "Salvar" }));

		expect(await screen.findByText("Cargo já existe")).toBeVisible();
		expect(screen.getByRole("dialog")).toBeInTheDocument();
	});
});

it("renderiza trigger e controla abertura não controlada", async () => {
	const user = userEvent.setup();
	render(
		<CreateRoleDialog trigger={<button type="button">Abrir dialog</button>} />,
		{ wrapper: createWrapper() },
	);
	await user.click(screen.getByRole("button", { name: "Abrir dialog" }));
	expect(await screen.findByRole("dialog")).toBeInTheDocument();
	expect(screen.getByText("Novo cargo")).toBeVisible();
	await user.click(screen.getByRole("button", { name: "Fechar" }));
	await waitFor(() =>
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
	);
});
