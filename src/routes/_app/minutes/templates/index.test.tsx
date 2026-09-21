import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MinuteTemplate } from "#/lib/minutes/schema";

const mocks = vi.hoisted(() => ({
	useMinuteTemplates: vi.fn(),
	useCreateMinuteTemplate: vi.fn(),
	useNavigate: vi.fn(),
	navigate: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (options: unknown) => options,
	useNavigate: mocks.useNavigate,
}));

vi.mock("#/hooks/minutes/use-minute-templates", () => ({
	useMinuteTemplates: mocks.useMinuteTemplates,
}));

vi.mock("#/hooks/minutes/use-create-minute-template", () => ({
	useCreateMinuteTemplate: mocks.useCreateMinuteTemplate,
}));

import { Route } from "./index";

const MinuteTemplatesPage = (
	Route as unknown as { component: React.ComponentType }
).component;

function makeTemplate(overrides: Partial<MinuteTemplate> = {}): MinuteTemplate {
	const now = new Date("2026-01-01T00:00:00Z");
	return {
		id: "template-1",
		name: "Modelo padrão",
		headerContent: JSON.stringify({
			type: "doc",
			content: [{ type: "paragraph" }],
		}),
		bodyContent: JSON.stringify({
			type: "doc",
			content: [{ type: "paragraph" }],
		}),
		footerContent: JSON.stringify({
			type: "doc",
			content: [{ type: "paragraph" }],
		}),
		showMeeting: true,
		showClasses: true,
		showParticipants: true,
		showRecords: true,
		showGeneralReports: false,
		showSignatures: true,
		createdAt: now,
		updatedAt: now,
		...overrides,
	};
}

beforeEach(() => {
	mocks.useMinuteTemplates.mockReturnValue({
		data: [makeTemplate()],
		isLoading: false,
		isError: false,
		error: null,
		refetch: vi.fn(),
	});
	mocks.useCreateMinuteTemplate.mockReturnValue({
		isPending: false,
		error: null,
		mutate: vi.fn(),
	});
	mocks.useNavigate.mockReturnValue(mocks.navigate);
});

describe("MinuteTemplatesPage", () => {
	it("apresenta os modelos na tabela padrão e abre a edição ao selecionar uma linha", () => {
		render(<MinuteTemplatesPage />);

		const table = screen.getByRole("table", {
			name: "Tabela de modelos de ata",
		});
		expect(
			within(table).getByRole("columnheader", { name: "Nome" }),
		).toBeInTheDocument();
		expect(
			within(table).getByRole("columnheader", { name: "Personalização" }),
		).toBeInTheDocument();

		fireEvent.click(within(table).getByRole("cell", { name: "Modelo padrão" }));

		expect(mocks.navigate).toHaveBeenCalledWith({
			to: "/minutes/templates/$id",
			params: { id: "template-1" },
		});
	});

	it("abre e fecha o formulário de cadastro pelo cabeçalho", () => {
		render(<MinuteTemplatesPage />);

		fireEvent.click(screen.getByRole("button", { name: "Novo modelo" }));
		expect(screen.getByLabelText("Nome *")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Fechar" })).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
		expect(screen.queryByLabelText("Nome *")).not.toBeInTheDocument();
	});

	it("permite criar um modelo a partir do estado vazio", async () => {
		const mutate = vi.fn((_, options) => options?.onSuccess?.());
		mocks.useMinuteTemplates.mockReturnValue({
			data: [],
			isLoading: false,
			isError: false,
			error: null,
			refetch: vi.fn(),
		});
		mocks.useCreateMinuteTemplate.mockReturnValue({
			isPending: false,
			error: null,
			mutate,
		});

		render(<MinuteTemplatesPage />);

		const newModelButtons = screen.getAllByRole("button", {
			name: "Novo modelo",
		});
		fireEvent.click(newModelButtons.at(-1)!);
		fireEvent.change(screen.getByLabelText("Nome *"), {
			target: { value: "Modelo novo" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Criar modelo" }));

		await waitFor(() =>
			expect(mutate).toHaveBeenCalledWith(
				expect.objectContaining({ name: "Modelo novo" }),
				expect.objectContaining({ onSuccess: expect.any(Function) }),
			),
		);
		expect(screen.queryByLabelText("Nome *")).not.toBeInTheDocument();
	});

	it("exibe a personalização disponível no modelo", () => {
		mocks.useMinuteTemplates.mockReturnValue({
			data: [
				makeTemplate({
					bodyContent: JSON.stringify({
						type: "doc",
						content: [
							{ type: "paragraph", content: [{ type: "text", text: "Corpo" }] },
						],
					}),
				}),
			],
			isLoading: false,
			isError: false,
			error: null,
			refetch: vi.fn(),
		});

		render(<MinuteTemplatesPage />);

		expect(screen.getByRole("cell", { name: "Conteúdo" })).toBeInTheDocument();
	});

	it("reinicia a paginação ao alterar a quantidade de itens por página", async () => {
		const user = userEvent.setup();
		mocks.useMinuteTemplates.mockReturnValue({
			data: Array.from({ length: 11 }, (_, index) =>
				makeTemplate({
					id: `template-${index + 1}`,
					name: `Modelo ${index + 1}`,
				}),
			),
			isLoading: false,
			isError: false,
			error: null,
			refetch: vi.fn(),
		});

		render(<MinuteTemplatesPage />);

		await user.click(screen.getByRole("link", { name: "2" }));
		expect(screen.getByRole("cell", { name: "Modelo 11" })).toBeInTheDocument();

		await user.click(
			screen.getByRole("combobox", { name: "Itens por página" }),
		);
		await user.click(screen.getByRole("option", { name: "20 / página" }));

		expect(screen.getByText("Mostrando 1–11 de 11")).toBeInTheDocument();
		expect(screen.getByRole("cell", { name: "Modelo 1" })).toBeInTheDocument();
	});

	it("exibe o estado e a falha do cadastro", () => {
		mocks.useCreateMinuteTemplate.mockReturnValue({
			isPending: true,
			error: new Error("Falha ao cadastrar modelo"),
			mutate: vi.fn(),
		});

		render(<MinuteTemplatesPage />);
		fireEvent.click(screen.getByRole("button", { name: "Novo modelo" }));

		expect(
			screen.getByRole("button", { name: "Salvando..." }),
		).toBeInTheDocument();
		expect(screen.getByText("Falha ao cadastrar modelo")).toBeInTheDocument();
	});

	it("exibe o erro da lista e permite tentar novamente", () => {
		const refetch = vi.fn();
		mocks.useMinuteTemplates.mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: true,
			error: new Error("Falha ao carregar modelos"),
			refetch,
		});

		render(<MinuteTemplatesPage />);

		expect(screen.getByText("Falha ao carregar modelos")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
		expect(refetch).toHaveBeenCalledOnce();
	});
});
