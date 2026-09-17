import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Meeting } from "#/lib/meetings/schema";

const mocks = vi.hoisted(() => ({
	useMeeting: vi.fn(),
	useMinutePreview: vi.fn(),
	useMinuteContent: vi.fn(),
	useMinuteVersions: vi.fn(),
	generateMock: vi.fn(),
	mutateAsync: vi.fn(),
	updateContentMock: vi.fn(),
	approveMock: vi.fn(),
	state: { lastApproveValues: undefined as unknown },
}));

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => () => ({
		useParams: () => ({ meetingId: "meeting-1" }),
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

vi.mock("#/hooks/meetings/use-meeting", () => ({
	useMeeting: mocks.useMeeting,
}));
vi.mock("#/hooks/minutes/use-minute-preview", () => ({
	useMinutePreview: mocks.useMinutePreview,
}));
vi.mock("#/hooks/minutes/use-minute-content", () => ({
	useMinuteContent: mocks.useMinuteContent,
}));
vi.mock("#/hooks/minutes/use-minute-versions", () => ({
	useMinuteVersions: mocks.useMinuteVersions,
}));
vi.mock("#/hooks/minutes/use-generate-minute", () => ({
	useGenerateMinute: () => mocks.generateMock(),
}));
vi.mock("#/hooks/minutes/use-update-minute-content", () => ({
	useUpdateMinuteContent: () => mocks.updateContentMock(),
}));
vi.mock("#/hooks/minutes/use-approve-minute", () => ({
	useApproveMinute: () => mocks.approveMock(),
}));

import MinuteDetailPage from "./$meetingId";

function makeMeeting(overrides: Partial<Meeting> = {}): Meeting {
	const now = new Date("2026-01-01T00:00:00Z");
	return {
		id: "meeting-1",
		title: "Conselho de Classe",
		status: "in_progress",
		heldAt: now,
		templateId: null,
		createdAt: now,
		updatedAt: now,
		...overrides,
	} as Meeting;
}

function renderPage() {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	return render(
		<QueryClientProvider client={client}>
			<MinuteDetailPage />
		</QueryClientProvider>,
	);
}

beforeEach(() => {
	mocks.useMeeting.mockReturnValue({
		data: makeMeeting(),
		isLoading: false,
	});
	mocks.useMinutePreview.mockReturnValue({
		data: {
			meetingId: "meeting-1",
			templateId: null,
			status: "in_progress",
			approvalStatus: "pendente_aprovacao",
			content: "ATA — CONSELHO DE CLASSE",
		},
		isLoading: false,
		error: null,
	});
	mocks.useMinuteContent.mockReturnValue({
		data: undefined,
		isLoading: false,
		error: null,
	});
	mocks.useMinuteVersions.mockReturnValue({
		data: [
			{
				id: "v1",
				minuteId: "minute-1",
				version: 1,
				isCurrent: true,
				notes: null,
				createdAt: "2026-05-20T10:00:00.000Z",
				hasPdf: true,
			},
		],
		isLoading: false,
		error: null,
	});
	mocks.mutateAsync.mockReset();
	mocks.mutateAsync.mockResolvedValue({
		minuteId: "minute-1",
		version: 2,
		isCurrent: true,
		createdAt: "2026-05-21T10:00:00.000Z",
		approvalStatus: "pendente_aprovacao",
		pdfSize: 10,
	});
	mocks.generateMock.mockReturnValue({
		mutateAsync: mocks.mutateAsync,
		isPending: false,
		error: null,
		data: undefined,
	});
	mocks.updateContentMock.mockReturnValue({
		mutateAsync: vi.fn().mockResolvedValue(undefined),
		isPending: false,
		error: null,
	});
	mocks.approveMock.mockReset();
	mocks.approveMock.mockReturnValue({
		mutate: (values: unknown, options?: { onSuccess?: () => void }) => {
			mocks.state.lastApproveValues = values;
			options?.onSuccess?.();
		},
		isPending: false,
		error: null,
	});
});

describe("MinuteDetailPage", () => {
	it("exibe esqueleto enquanto a reunião carrega", () => {
		mocks.useMeeting.mockReturnValue({ data: undefined, isLoading: true });
		renderPage();
		expect(screen.queryByText("Prévia da ata")).not.toBeInTheDocument();
	});

	it("exibe estado vazio quando a ata não existe", () => {
		mocks.useMeeting.mockReturnValue({ data: undefined, isLoading: false });
		renderPage();
		expect(screen.getByText("Ata não encontrada")).toBeInTheDocument();
	});

	it("renderiza prévia, aprovação e versões", () => {
		renderPage();
		expect(
			screen.getByRole("heading", { name: "Ata de Conselho de Classe" }),
		).toBeInTheDocument();
		expect(screen.getByText("ATA — CONSELHO DE CLASSE")).toBeInTheDocument();
		expect(screen.getByText("Versão 1")).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: /Baixar PDF/ }),
		).toBeInTheDocument();
	});

	it("exibe o editor do conteúdo próprio da reunião", async () => {
		const mutateAsync = vi.fn().mockResolvedValue(undefined);
		mocks.useMinuteContent.mockReturnValue({
			data: {
				presetId: "preset-1",
				presetName: "Preset Conselho",
				headerContent: JSON.stringify({ type: "doc", content: [] }),
				bodyContent: JSON.stringify({ type: "doc", content: [] }),
				footerContent: JSON.stringify({ type: "doc", content: [] }),
			},
			isLoading: false,
			error: null,
		});
		mocks.updateContentMock.mockReturnValue({
			mutateAsync,
			isPending: false,
			error: null,
		});
		const user = userEvent.setup();

		renderPage();

		expect(screen.getByText(/Conteúdo inicial do preset/)).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Salvar conteúdo" }));
		await screen.findByText("Conteúdo da ata atualizado.");
		expect(mutateAsync).toHaveBeenCalledWith(
			expect.objectContaining({
				headerContent: expect.any(Object),
				bodyContent: expect.any(Object),
				footerContent: expect.any(Object),
			}),
		);
	});

	it("aprova a ata e exibe confirmação", async () => {
		const user = userEvent.setup();
		renderPage();

		await user.click(screen.getByRole("button", { name: "Aprovar ata" }));

		expect(mocks.state.lastApproveValues).toEqual({
			data: undefined,
			observacao: undefined,
		});
		expect(await screen.findByText("Ata aprovada")).toBeInTheDocument();
	});

	it("gera nova versão direto quando a ata não está aprovada", async () => {
		const user = userEvent.setup();
		renderPage();

		await user.type(
			screen.getByLabelText("Observação da versão"),
			"Ajuste de registros",
		);
		await user.click(screen.getByRole("button", { name: "Gerar nova versão" }));

		expect(mocks.mutateAsync).toHaveBeenCalledWith({
			observacao: "Ajuste de registros",
		});
		expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
	});

	it("requer confirmação antes de regenerar a ata aprovada", async () => {
		const user = userEvent.setup();
		mocks.useMinutePreview.mockReturnValue({
			data: {
				meetingId: "meeting-1",
				templateId: null,
				status: "in_progress",
				approvalStatus: "aprovada",
				content: "ATA",
			},
			isLoading: false,
			error: null,
		});
		renderPage();

		await user.click(screen.getByRole("button", { name: "Gerar nova versão" }));

		expect(screen.getByRole("alertdialog")).toBeInTheDocument();
		expect(mocks.mutateAsync).not.toHaveBeenCalled();

		await user.click(
			within(screen.getByRole("alertdialog")).getByRole("button", {
				name: "Gerar nova versão",
			}),
		);
		expect(mocks.mutateAsync).toHaveBeenCalledTimes(1);
		expect(mocks.mutateAsync).toHaveBeenCalledWith({ observacao: undefined });
	});

	it("não regenera nada se cancelar a confirmação da ata aprovada", async () => {
		const user = userEvent.setup();
		mocks.useMinutePreview.mockReturnValue({
			data: {
				meetingId: "meeting-1",
				templateId: null,
				status: "in_progress",
				approvalStatus: "aprovada",
				content: "ATA",
			},
			isLoading: false,
			error: null,
		});
		renderPage();

		await user.click(screen.getByRole("button", { name: "Gerar nova versão" }));
		await user.click(
			within(screen.getByRole("alertdialog")).getByRole("button", {
				name: "Cancelar",
			}),
		);

		expect(mocks.mutateAsync).not.toHaveBeenCalled();
	});
});
