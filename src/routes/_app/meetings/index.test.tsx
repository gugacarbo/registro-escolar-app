import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Meeting } from "#/lib/meetings/schema";
import type { MeetingsPageResult } from "#/lib/meetings/types";

const mocks = vi.hoisted(() => ({
	useMeetings: vi.fn(),
	useNavigate: vi.fn(),
	navigate: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => () => ({}),
	useNavigate: mocks.useNavigate,
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

vi.mock("#/hooks/meetings/use-meetings", () => ({
	useMeetings: mocks.useMeetings,
}));

vi.mock("#/components/meetings/create-meeting-dialog", () => ({
	CreateMeetingDialog: () => null,
}));

vi.mock("#/components/meetings/transition-buttons", () => ({
	TransitionButtons: ({ meetingId }: { meetingId: string }) => (
		<span data-testid={`transitions-${meetingId}`} />
	),
}));

import MeetingsPage from "./index";

function makeMeeting(overrides: Partial<Meeting> = {}): Meeting {
	const now = new Date("2026-01-01T00:00:00Z");
	return {
		id: "meeting-1",
		title: "Conselho de classe",
		status: "open",
		heldAt: null,
		location: null,
		templateId: null,
		createdAt: now,
		updatedAt: now,
		...overrides,
	};
}

function makePage(
	overrides: Partial<MeetingsPageResult> = {},
): MeetingsPageResult {
	return {
		data: [makeMeeting()],
		total: 1,
		page: 1,
		pageSize: 10,
		...overrides,
	};
}

function renderPage() {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(
		<QueryClientProvider client={client}>
			<MeetingsPage />
		</QueryClientProvider>,
	);
}

beforeEach(() => {
	vi.useFakeTimers();
	mocks.useMeetings.mockReturnValue({
		data: makePage(),
		isLoading: false,
		isError: false,
	});
	mocks.useNavigate.mockReturnValue(mocks.navigate);
});

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe("MeetingsPage", () => {
	it("renderiza a tabela com status, título linkado e ações", () => {
		renderPage();

		const table = screen.getByRole("table", { name: "Tabela de reuniões" });
		expect(
			within(table).getByRole("columnheader", { name: "Status" }),
		).toBeInTheDocument();
		expect(
			within(table).getByRole("columnheader", { name: "Título" }),
		).toBeInTheDocument();
		expect(
			within(table).getByRole("columnheader", { name: "Ações" }),
		).toBeInTheDocument();
		const link = within(table).getByRole("link", {
			name: "Conselho de classe",
		});
		expect(link).toHaveAttribute("href", "/meetings/$meetingId");
		expect(screen.getByTestId("transitions-meeting-1")).toBeInTheDocument();
	});

	it("mantém as ações visíveis no mobile e move o status para o título", () => {
		renderPage();

		const table = screen.getByRole("table", { name: "Tabela de reuniões" });
		expect(
			within(table).getByRole("columnheader", { name: "Status" }),
		).toHaveClass("hidden", "sm:table-cell");
		expect(
			screen
				.getAllByText("Aberta")
				.some((status) =>
					status.parentElement?.classList.contains("sm:hidden"),
				),
		).toBe(true);
		expect(
			screen.getByTestId("transitions-meeting-1").closest("td"),
		).not.toHaveClass("hidden");
	});

	it("exibe estado vazio quando não há reuniões", () => {
		mocks.useMeetings.mockReturnValue({
			data: makePage({ data: [], total: 0 }),
			isLoading: false,
			isError: false,
		});
		renderPage();

		expect(screen.getByText("Nenhuma reunião encontrada")).toBeInTheDocument();
		expect(screen.getByText("Nenhum registro encontrado")).toBeInTheDocument();
	});

	it("exibe erro quando a query falha", () => {
		mocks.useMeetings.mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: true,
		});
		renderPage();

		expect(screen.getByRole("alert")).toHaveTextContent(
			"Falha ao carregar os dados",
		);
	});

	it("troca de página chamando o hook com a nova página", () => {
		mocks.useMeetings.mockReturnValue({
			data: makePage({ total: 25 }),
			isLoading: false,
			isError: false,
		});
		renderPage();

		fireEvent.click(screen.getByRole("link", { name: "2" }));

		expect(mocks.useMeetings).toHaveBeenLastCalledWith({
			search: undefined,
			status: undefined,
			page: 2,
			pageSize: 10,
		});
	});

	it("debounceia a busca e volta para a página 1", () => {
		mocks.useMeetings.mockReturnValue({
			data: makePage({ total: 25 }),
			isLoading: false,
			isError: false,
		});
		renderPage();
		mocks.useMeetings.mockClear();

		fireEvent.click(screen.getByRole("link", { name: "2" }));
		const search = screen.getByLabelText("Buscar por título");
		fireEvent.change(search, { target: { value: "Conselho" } });

		expect(mocks.useMeetings).toHaveBeenLastCalledWith({
			search: undefined,
			status: undefined,
			page: 2,
			pageSize: 10,
		});

		act(() => {
			vi.advanceTimersByTime(300);
		});
		expect(mocks.useMeetings).toHaveBeenLastCalledWith({
			search: "Conselho",
			status: undefined,
			page: 1,
			pageSize: 10,
		});
	});

	it("navega para o detalhe ao clicar em célula de texto da linha", () => {
		renderPage();

		const table = screen.getByRole("table", { name: "Tabela de reuniões" });
		fireEvent.click(within(table).getAllByText("Aberta")[0]);

		expect(mocks.navigate).toHaveBeenCalledTimes(1);
		expect(mocks.navigate).toHaveBeenCalledWith({
			to: "/meetings/$meetingId",
			params: { meetingId: "meeting-1" },
		});
	});

	it("clicar no link do título não dispara a navegação da linha", () => {
		renderPage();

		const table = screen.getByRole("table", { name: "Tabela de reuniões" });
		fireEvent.click(
			within(table).getByRole("link", { name: "Conselho de classe" }),
		);

		expect(mocks.navigate).not.toHaveBeenCalled();
	});

	it("clicar nos botões de transição não dispara a navegação da linha", () => {
		renderPage();

		fireEvent.click(screen.getByTestId("transitions-meeting-1"));

		expect(mocks.navigate).not.toHaveBeenCalled();
	});
});
