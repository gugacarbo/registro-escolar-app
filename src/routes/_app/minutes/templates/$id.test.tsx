import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MinuteTemplate } from "#/lib/minutes/schema";

const mocks = vi.hoisted(() => ({
	useMinuteTemplate: vi.fn(),
	useUpdateMinuteTemplate: vi.fn(),
	mutateAsync: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => () => ({
		useParams: () => ({ id: "template-1" }),
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

vi.mock("#/hooks/minutes/use-minute-template", () => ({
	useMinuteTemplate: mocks.useMinuteTemplate,
}));

vi.mock("#/hooks/minutes/use-update-minute-template", () => ({
	useUpdateMinuteTemplate: mocks.useUpdateMinuteTemplate,
}));

import { textDoc } from "#/lib/minutes/tiptap/serializer";
import MinuteTemplateDetailPage from "./$id";

function makeTemplate(overrides: Partial<MinuteTemplate> = {}): MinuteTemplate {
	const now = new Date("2026-01-01T00:00:00Z");
	return {
		id: "template-1",
		name: "Modelo padrão",
		headerContent: JSON.stringify(textDoc("Cabeçalho padrão")),
		bodyContent: JSON.stringify(textDoc("Conteúdo padrão")),
		footerContent: JSON.stringify(textDoc("Rodapé padrão")),
		showMeeting: true,
		showClasses: true,
		showParticipants: true,
		showRecords: true,
		showGeneralReports: true,
		showSignatures: true,
		createdAt: now,
		updatedAt: now,
		...overrides,
	};
}

function renderPage() {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	return render(
		<QueryClientProvider client={client}>
			<MinuteTemplateDetailPage />
		</QueryClientProvider>,
	);
}

beforeEach(() => {
	mocks.mutateAsync.mockReset();
	mocks.mutateAsync.mockResolvedValue(makeTemplate());
	mocks.useUpdateMinuteTemplate.mockReturnValue({
		isPending: false,
		mutateAsync: mocks.mutateAsync,
	});
	mocks.useMinuteTemplate.mockReturnValue({
		data: makeTemplate(),
		isLoading: false,
		isError: false,
		error: null,
	});
});

describe("MinuteTemplateDetailPage", () => {
	it("carrega os valores existentes no formulário", () => {
		renderPage();

		expect(screen.getByText("Configuração")).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Voltar para a lista" }),
		).toHaveAttribute("href", "/minutes/templates");
		expect(screen.getByLabelText("Nome *")).toHaveValue("Modelo padrão");
		expect(screen.getByText("Cabeçalho")).toBeInTheDocument();
	});

	it.skip("aceita datas serializadas pela API ao carregar o formulário", () => {
		mocks.useMinuteTemplate.mockReturnValue({
			data: makeTemplate({
				updatedAt: "2026-01-01T00:00:00.000Z" as never,
			}),
			isLoading: false,
			isError: false,
			error: null,
		});

		renderPage();

		expect(screen.getByText("Cabeçalho")).toBeInTheDocument();
	});

	it("exibe uma falha de carregamento sem formulário", () => {
		mocks.useMinuteTemplate.mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: true,
			error: new Error("Template de ata não encontrado"),
		});
		renderPage();

		expect(
			screen.getByText("Template de ata não encontrado"),
		).toBeInTheDocument();
		expect(screen.queryByLabelText("Nome *")).not.toBeInTheDocument();
	});

	it("salva as alterações e confirma a atualização", async () => {
		const user = userEvent.setup();
		renderPage();

		await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

		expect(mocks.mutateAsync).toHaveBeenCalledWith(
			expect.objectContaining({ name: "Modelo padrão" }),
		);
		expect(await screen.findByText("Modelo atualizado")).toBeInTheDocument();
	});

	it("exibe o estado de carregamento antes de receber o template", () => {
		mocks.useMinuteTemplate.mockReturnValue({
			data: undefined,
			isLoading: true,
			isError: false,
			error: null,
		});

		renderPage();

		expect(screen.getByText("Carregando...")).toBeInTheDocument();
	});

	it("usa mensagem padrão para falha de carregamento sem detalhe", () => {
		mocks.useMinuteTemplate.mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: true,
			error: null,
		});

		renderPage();

		expect(
			screen.getByText("Falha ao carregar template de ata"),
		).toBeInTheDocument();
	});

	it("exibe o estado de atualização em andamento", () => {
		mocks.useUpdateMinuteTemplate.mockReturnValue({
			isPending: true,
			mutateAsync: mocks.mutateAsync,
		});
		renderPage();

		expect(
			screen.getByRole("button", { name: "Salvando..." }),
		).toBeInTheDocument();
	});

	it("exibe a falha retornada ao salvar", async () => {
		const user = userEvent.setup();
		mocks.mutateAsync.mockRejectedValueOnce(
			new Error("Não foi possível salvar"),
		);
		renderPage();

		await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

		expect(
			await screen.findByText("Não foi possível salvar"),
		).toBeInTheDocument();
	});

	it("usa mensagem padrão para uma falha de salvamento sem detalhe", async () => {
		const user = userEvent.setup();
		mocks.mutateAsync.mockRejectedValueOnce("erro sem mensagem");
		renderPage();

		await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

		expect(
			await screen.findByText("Falha ao atualizar template de ata"),
		).toBeInTheDocument();
	});
});
