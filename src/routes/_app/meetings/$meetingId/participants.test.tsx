import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	useParticipants: vi.fn(),
	addAsync: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => () => ({
		useParams: () => ({ meetingId: "meeting-1" }),
	}),
}));
vi.mock("#/hooks/meetings/use-participants", () => ({
	useParticipants: mocks.useParticipants,
}));
vi.mock("#/hooks/meetings/use-add-participant", () => ({
	useAddParticipant: () => ({ mutateAsync: mocks.addAsync, isPending: false }),
}));

import { ParticipantsPage } from "./participants";

function fetchJson(data: unknown, total: number) {
	return new Response(JSON.stringify({ data, total, page: 1, pageSize: 100 }), {
		status: 200,
	});
}

function renderPage() {
	return render(
		<QueryClientProvider client={new QueryClient()}>
			<ParticipantsPage />
		</QueryClientProvider>,
	);
}

beforeEach(() => {
	vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
		const url = typeof input === "string" ? input : String(input);
		if (url.startsWith("/api/staff")) {
			return fetchJson([{ id: "staff-1", name: "Maria Silva" }], 1);
		}
		if (url.startsWith("/api/roles")) {
			return fetchJson([{ id: "role-1", name: "Coordenador" }], 1);
		}
		return new Response(JSON.stringify({ error: "x" }), { status: 500 });
	});
	mocks.useParticipants.mockReturnValue({
		data: [{ id: "p-1", staffId: "staff-1", roleId: "role-1" }],
		isLoading: false,
	});
});

describe("ParticipantsPage", () => {
	it("exibe nomes legíveis de servidor e papel", async () => {
		renderPage();
		expect(
			await screen.findByText(/Maria Silva — Coordenador/),
		).toBeInTheDocument();
	});

	it("exibe estado de carregamento", () => {
		mocks.useParticipants.mockReturnValue({ data: undefined, isLoading: true });
		renderPage();
		expect(screen.getByText("Carregando...")).toBeInTheDocument();
	});

	it("exige servidor e papel antes de adicionar", async () => {
		const user = userEvent.setup();
		renderPage();
		await user.click(screen.getByRole("button", { name: "Adicionar" }));
		expect(
			await screen.findByText("Selecione o servidor e o papel"),
		).toBeInTheDocument();
	});

	it("exibe erro do servidor ao adicionar participante", async () => {
		const user = userEvent.setup();
		mocks.addAsync.mockRejectedValue(new Error("Participante duplicado"));
		renderPage();
		await user.click(screen.getByLabelText("Servidor"));
		await user.click(
			await screen.findByRole("option", { name: "Maria Silva" }),
		);
		await user.click(screen.getByLabelText("Papel"));
		await user.click(
			await screen.findByRole("option", { name: "Coordenador" }),
		);
		await user.click(screen.getByRole("button", { name: "Adicionar" }));
		expect(
			await screen.findByText("Participante duplicado"),
		).toBeInTheDocument();
	});

	it("adiciona participante com os IDs selecionados", async () => {
		const user = userEvent.setup();
		mocks.addAsync.mockResolvedValue({});
		renderPage();
		await user.click(screen.getByLabelText("Servidor"));
		await user.click(
			await screen.findByRole("option", { name: "Maria Silva" }),
		);
		await user.click(screen.getByLabelText("Papel"));
		await user.click(
			await screen.findByRole("option", { name: "Coordenador" }),
		);
		await user.click(screen.getByRole("button", { name: "Adicionar" }));
		expect(
			await screen.findByText(/Maria Silva — Coordenador/),
		).toBeInTheDocument();
		expect(mocks.addAsync).toHaveBeenCalledWith({
			staffId: "staff-1",
			roleId: "role-1",
		});
	});

	it("mostra IDs quando nomes não estão carregados", async () => {
		vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
			const url = typeof input === "string" ? input : String(input);
			if (url.startsWith("/api/staff") || url.startsWith("/api/roles")) {
				return fetchJson([], 0);
			}
			return new Response(JSON.stringify({ error: "x" }), { status: 500 });
		});
		mocks.useParticipants.mockReturnValue({
			data: [
				{ id: "p-unknown", staffId: "unknown-staff", roleId: "unknown-role" },
			],
			isLoading: false,
		});
		renderPage();
		expect(
			await screen.findByText(/unknown-staff — unknown-role/),
		).toBeInTheDocument();
	});
});
