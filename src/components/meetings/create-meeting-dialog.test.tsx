import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CreateMeetingDialog } from "./create-meeting-dialog";

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
	return render(<CreateMeetingDialog open {...props} />, {
		wrapper: createWrapper(),
	});
}

beforeEach(() => {
	vi.unstubAllGlobals();
	vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
		const url = typeof input === "string" ? input : String(input);
		if (url.startsWith("/api/classes")) {
			return new Response(
				JSON.stringify({ data: [], total: 0, page: 1, pageSize: 100 }),
				{ status: 200 },
			);
		}
		if (url.startsWith("/api/staff")) {
			return new Response(
				JSON.stringify({ data: [], total: 0, page: 1, pageSize: 100 }),
				{ status: 200 },
			);
		}
		if (url.startsWith("/api/roles")) {
			return new Response(
				JSON.stringify({ data: [], total: 0, page: 1, pageSize: 100 }),
				{ status: 200 },
			);
		}
		return new Response(JSON.stringify([]), { status: 200 });
	});
});

describe("CreateMeetingDialog", () => {
	it("renderiza o formulário dentro do dialog quando aberto", async () => {
		renderDialog();

		expect(await screen.findByRole("dialog")).toBeInTheDocument();
		expect(screen.getByText("Nova reunião")).toBeVisible();
		expect(screen.getByLabelText("Nome *")).toBeVisible();
		expect(screen.getByLabelText("Modelo de ata")).toBeVisible();
		expect(screen.getByRole("button", { name: "Salvar" })).toBeInTheDocument();
	});

	it("exibe erro de validação quando os campos obrigatórios estão vazios", async () => {
		const user = userEvent.setup();
		renderDialog();

		await user.click(screen.getByRole("button", { name: "Salvar" }));

		expect(await screen.findByText("Nome é obrigatório")).toBeVisible();
		expect(
			await screen.findByText("Selecione ao menos uma turma"),
		).toBeVisible();
	});

	it("cria a reunião, fecha o dialog e notifica sucesso com o id", async () => {
		const user = userEvent.setup();
		const onSuccess = vi.fn();
		vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
			const url = typeof input === "string" ? input : String(input);
			if (url === "/api/meetings" && init?.method === "POST") {
				return new Response(JSON.stringify({ id: "meeting-1" }), {
					status: 201,
				});
			}
			if (url.startsWith("/api/classes")) {
				return new Response(
					JSON.stringify({
						data: [{ id: "class-1", name: "9º Ano", academicPeriod: "2026" }],
						total: 1,
						page: 1,
						pageSize: 100,
					}),
					{ status: 200 },
				);
			}
			return new Response(JSON.stringify([]), { status: 200 });
		});

		function Controlled() {
			const [open, setOpen] = useState(true);
			return (
				<CreateMeetingDialog
					open={open}
					onOpenChange={setOpen}
					onSuccess={onSuccess}
				/>
			);
		}

		render(<Controlled />, { wrapper: createWrapper() });

		await user.type(await screen.findByLabelText("Nome *"), "Conselho UI");
		await user.click(screen.getByText("9º Ano — 2026"));
		await user.click(screen.getByRole("button", { name: "Salvar" }));

		await waitFor(() => expect(onSuccess).toHaveBeenCalledWith("meeting-1"));
		await waitFor(() =>
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
		);
	});

	it("envia data, modelo e participantes preenchidos", async () => {
		const user = userEvent.setup();
		const onSuccess = vi.fn();
		const fetchMock = vi
			.spyOn(globalThis, "fetch")
			.mockImplementation(async (input, init) => {
				const url = typeof input === "string" ? input : String(input);
				if (url === "/api/meetings" && init?.method === "POST") {
					return new Response(JSON.stringify({ id: "meeting-1" }), {
						status: 201,
					});
				}
				if (url.startsWith("/api/classes")) {
					return new Response(
						JSON.stringify({
							data: [{ id: "class-1", name: "9º Ano", academicPeriod: "2026" }],
							total: 1,
							page: 1,
							pageSize: 100,
						}),
					);
				}
				if (url.startsWith("/api/staff")) {
					return new Response(
						JSON.stringify({
							data: [{ id: "staff-1", name: "Maria" }],
							total: 1,
							page: 1,
							pageSize: 100,
						}),
					);
				}
				if (url.startsWith("/api/roles")) {
					return new Response(
						JSON.stringify({
							data: [
								{ id: "role-1", name: "Coordenador" },
								{ id: "role-2", name: "Secretário" },
							],
							total: 2,
							page: 1,
							pageSize: 100,
						}),
					);
				}
				return new Response(JSON.stringify([]), { status: 200 });
			});
		function Controlled() {
			const [open, setOpen] = useState(true);
			return (
				<CreateMeetingDialog
					open={open}
					onOpenChange={setOpen}
					onSuccess={onSuccess}
				/>
			);
		}
		render(<Controlled />, { wrapper: createWrapper() });
		await user.type(await screen.findByLabelText("Nome *"), "Conselho UI");
		await user.type(screen.getByLabelText("Data"), "2026-03-01");
		await user.click(await screen.findByText("9º Ano — 2026"));
		await user.click(
			screen.getByRole("button", { name: "Adicionar participante" }),
		);
		await user.click(screen.getByLabelText("Servidor"));
		await user.click(await screen.findByRole("option", { name: "Maria" }));
		await user.click(screen.getByRole("checkbox", { name: "Coordenador" }));
		await user.click(screen.getByRole("checkbox", { name: "Secretário" }));
		await user.click(screen.getByRole("button", { name: "Salvar" }));
		await waitFor(() => expect(onSuccess).toHaveBeenCalledWith("meeting-1"));
		const call = fetchMock.mock.calls.find(
			([url, init]) =>
				String(url).startsWith("/api/meetings") && init?.method === "POST",
		);
		expect(call && JSON.parse(String(call[1]?.body))).toEqual({
			title: "Conselho UI",
			heldAt: "2026-03-01",
			classIds: ["class-1"],
			participants: [{ staffId: "staff-1", roleIds: ["role-1", "role-2"] }],
		});
	});

	it("exibe erro vindo do servidor sem fechar o dialog", async () => {
		const user = userEvent.setup();
		vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
			const url = typeof input === "string" ? input : String(input);
			if (url === "/api/meetings" && init?.method === "POST") {
				return new Response(JSON.stringify({ error: "Reunião já existe" }), {
					status: 409,
				});
			}
			if (url.startsWith("/api/classes")) {
				return new Response(
					JSON.stringify({
						data: [{ id: "class-1", name: "9º Ano", academicPeriod: "2026" }],
						total: 1,
						page: 1,
						pageSize: 100,
					}),
					{ status: 200 },
				);
			}
			return new Response(JSON.stringify([]), { status: 200 });
		});
		renderDialog();

		await user.type(await screen.findByLabelText("Nome *"), "Conselho UI");
		await user.click(await screen.findByText("9º Ano — 2026"));
		await user.click(screen.getByRole("button", { name: "Salvar" }));

		expect(await screen.findByText("Reunião já existe")).toBeVisible();
		expect(screen.getByRole("dialog")).toBeInTheDocument();
	});

	it("usa trigger não controlado e limpa erro ao fechar", async () => {
		const user = userEvent.setup();
		render(
			<CreateMeetingDialog
				trigger={<button type="button">Abrir reunião</button>}
			/>,
			{ wrapper: createWrapper() },
		);
		await user.click(screen.getByRole("button", { name: "Abrir reunião" }));
		expect(await screen.findByRole("dialog")).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Fechar" }));
		await waitFor(() =>
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
		);
	});
});
