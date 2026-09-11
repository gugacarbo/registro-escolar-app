import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { OfferWithRelations } from "#/lib/offers/types";

const mocks = vi.hoisted(() => ({
	useOffers: vi.fn(),
	mutateAsync: vi.fn(),
	offerForm: vi.fn(),
}));

vi.mock("#/components/offers/offer-form", () => ({
	OfferForm: (props: Record<string, unknown>) => mocks.offerForm(props),
}));

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
	mocks.useOffers.mockReturnValue({
		data: [makeOffer()],
		isLoading: false,
	});
});

describe("ClassOffersPanel", () => {
	it("lista componentes ofertados com professores", () => {
		renderPanel();
		expect(screen.getByText("Matemática")).toBeInTheDocument();
		expect(screen.getByText("Professores: Maria")).toBeInTheDocument();
	});

	it("exibe estado vazio sem ofertas", () => {
		mocks.useOffers.mockReturnValue({ data: [], isLoading: false });
		renderPanel();
		expect(screen.getByText("Nenhum componente ofertado")).toBeInTheDocument();
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
