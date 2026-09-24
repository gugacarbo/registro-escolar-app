import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { OfferWithRelations } from "#/lib/offers/types";

const mocks = vi.hoisted(() => ({
	useOffers: vi.fn(),
	mutateAsync: vi.fn(),
	offerForm: vi.fn(),
	toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("#/components/offers/offer-form", () => ({
	OfferForm: (props: Record<string, unknown>) => mocks.offerForm(props),
}));

vi.mock("sonner", () => ({ toast: mocks.toast }));

vi.mock("#/hooks/offers/use-offers", () => ({
	useOffers: mocks.useOffers,
}));

vi.mock("#/hooks/offers/use-create-offer", () => ({
	useCreateOffer: () => ({ mutateAsync: mocks.mutateAsync }),
}));

import { ClassOffersPanel } from "./class-offers-panel";

function makeOffer(
	overrides: Partial<OfferWithRelations> = {},
): OfferWithRelations {
	return {
		id: "offer-1",
		classId: "class-1",
		componentId: "comp-1",
		createdAt: new Date(),
		updatedAt: new Date(),
		component: {
			id: "comp-1",
			name: "Matemática",
			createdAt: new Date(),
			updatedAt: new Date(),
		},
		professors: [
			{
				id: "op-1",
				staffId: "staff-1",
				staff: { id: "staff-1", name: "Maria" },
			},
		],
		...overrides,
	} as OfferWithRelations;
}

function renderPanel() {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(
		<QueryClientProvider client={client}>
			<ClassOffersPanel classId="class-1" turmaName="Turma A" />
		</QueryClientProvider>,
	);
}

beforeEach(() => {
	mocks.mutateAsync.mockReset();
	mocks.toast.success.mockReset();
	mocks.useOffers.mockReturnValue({
		data: [makeOffer()],
		isLoading: false,
	});
});

describe("ClassOffersPanel", () => {
	it("lista componentes ofertados com professores", () => {
		renderPanel();
		const table = screen.getByRole("table", {
			name: "Componentes ofertados",
		});
		expect(
			within(table).getByRole("columnheader", { name: "Componente" }),
		).toBeInTheDocument();
		expect(
			within(table).getByRole("columnheader", { name: "Professores" }),
		).toBeInTheDocument();
		expect(within(table).getByText("Matemática")).toBeInTheDocument();
		expect(within(table).getByText("Maria")).toBeInTheDocument();
	});

	it("exibe fallback quando a oferta não tem professor", () => {
		mocks.useOffers.mockReturnValue({
			data: [makeOffer({ professors: [] })],
			isLoading: false,
		});
		renderPanel();
		const table = screen.getByRole("table", {
			name: "Componentes ofertados",
		});
		expect(
			within(table).getByText("Sem professor atribuído"),
		).toBeInTheDocument();
	});

	it("exibe estado vazio sem ofertas", () => {
		mocks.useOffers.mockReturnValue({ data: [], isLoading: false });
		renderPanel();
		expect(screen.getByText("Nenhum componente ofertado.")).toBeInTheDocument();
	});

	it("abre o formulário de oferta pelo trigger do cabeçalho", async () => {
		const user = userEvent.setup();
		renderPanel();

		expect(screen.getByRole("button", { name: "Nova oferta" })).toBeVisible();
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Nova oferta" }));

		const dialog = await screen.findByRole("dialog");
		expect(dialog).toBeInTheDocument();
		expect(screen.getByRole("heading", { name: "Nova oferta" })).toBeVisible();
	});

	it("envia a turma fixa ao criar oferta", async () => {
		const user = userEvent.setup();
		mocks.offerForm.mockImplementation(
			(props: {
				onSubmit: (values: {
					componenteId: string;
					professorIds: string[];
				}) => Promise<void>;
			}) => (
				<button
					type="button"
					onClick={() =>
						props.onSubmit({ componenteId: "comp-1", professorIds: [] })
					}
				>
					ofertar
				</button>
			),
		);
		renderPanel();
		await user.click(screen.getByRole("button", { name: "Nova oferta" }));
		await user.click(await screen.findByRole("button", { name: "ofertar" }));
		expect(mocks.mutateAsync).toHaveBeenCalledWith({
			turmaId: "class-1",
			componenteId: "comp-1",
			professorIds: [],
		});
		expect(mocks.toast.success).toHaveBeenCalledWith("Oferta criada");
	});

	it("exibe aviso de erro quando a query de ofertas falha", () => {
		mocks.useOffers.mockReturnValue({
			isError: true,
			error: new Error("Falha ao carregar ofertas da turma"),
			isLoading: false,
		});
		renderPanel();

		expect(screen.getByRole("alert")).toHaveTextContent(
			"Falha ao carregar ofertas da turma",
		);
	});

	it("pagina os componentes ofertados", () => {
		const many = Array.from({ length: 11 }, (_, index) =>
			makeOffer({
				id: `offer-${index + 1}`,
				componentId: `comp-${index + 1}`,
				component: {
					id: `comp-${index + 1}`,
					name: `Componente ${index + 1}`,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			}),
		);
		mocks.useOffers.mockReturnValue({ data: many, isLoading: false });
		renderPanel();

		const table = screen.getByRole("table", {
			name: "Componentes ofertados",
		});
		expect(within(table).getByText("Componente 1")).toBeInTheDocument();
		expect(
			within(table).queryByText("Componente 11"),
		).not.toBeInTheDocument();
		expect(screen.getByText("Mostrando 1–10 de 11")).toBeInTheDocument();
	});

	it("mantém o dialog aberto enquanto cria a oferta", async () => {
		const user = userEvent.setup();
		let resolveCreation: (() => void) | undefined;
		mocks.mutateAsync.mockReturnValue(
			new Promise<void>((resolve) => {
				resolveCreation = resolve;
			}),
		);
		mocks.offerForm.mockImplementation(
			(props: {
				onSubmit: (values: {
					componenteId: string;
					professorIds: string[];
				}) => Promise<void>;
			}) => (
				<button
					type="button"
					onClick={() =>
						props.onSubmit({ componenteId: "comp-1", professorIds: [] })
					}
				>
					ofertar
				</button>
			),
		);
		renderPanel();
		await user.click(screen.getByRole("button", { name: "Nova oferta" }));
		await user.click(await screen.findByRole("button", { name: "ofertar" }));
		await user.click(screen.getByRole("button", { name: "Fechar" }));

		expect(screen.getByRole("dialog")).toBeInTheDocument();
		resolveCreation?.();
		await waitFor(() =>
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
		);
	});

	it("exibe erro de servidor ao falhar", async () => {
		const user = userEvent.setup();
		mocks.mutateAsync.mockRejectedValue(new Error("Oferta duplicada"));
		mocks.offerForm.mockImplementation(
			(props: {
				onSubmit: (values: {
					componenteId: string;
					professorIds: string[];
				}) => Promise<void>;
				serverError?: string | null;
			}) => (
				<button
					type="button"
					onClick={() =>
						props.onSubmit({ componenteId: "comp-1", professorIds: [] })
					}
				>
					ofertar{props.serverError ? ` (${props.serverError})` : ""}
				</button>
			),
		);
		renderPanel();
		await user.click(screen.getByRole("button", { name: "Nova oferta" }));
		await user.click(await screen.findByRole("button", { name: /ofertar/ }));
		expect(
			await screen.findByText("ofertar (Oferta duplicada)"),
		).toBeInTheDocument();
	});
});
