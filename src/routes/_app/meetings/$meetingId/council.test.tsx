import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	useMeeting: vi.fn(),
	useMeetingClasses: vi.fn(),
	useMeetingClassStudents: vi.fn(),
	useMeetingStudentRecords: vi.fn(),
	useCreateLinkedRecord: vi.fn(),
	useUpdateLinkedRecord: vi.fn(),
	useSetRecordInclusion: vi.fn(),
	useComponents: vi.fn(),
	useParticipants: vi.fn(),
	useGeneralReports: vi.fn(),
	useCreateGeneralReport: vi.fn(),
	useUpdateGeneralReport: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => () => ({
		useParams: () => ({ meetingId: "meeting-1" }),
	}),
}));

vi.mock("#/hooks/meetings/use-meeting", () => ({
	useMeeting: mocks.useMeeting,
}));
vi.mock("#/hooks/meetings/use-meeting-classes", () => ({
	useMeetingClasses: mocks.useMeetingClasses,
}));
vi.mock("#/hooks/meetings/use-meeting-class-students", () => ({
	useMeetingClassStudents: mocks.useMeetingClassStudents,
}));
vi.mock("#/hooks/records/use-records", () => ({
	useMeetingStudentRecords: mocks.useMeetingStudentRecords,
	useCreateLinkedRecord: mocks.useCreateLinkedRecord,
	useUpdateLinkedRecord: mocks.useUpdateLinkedRecord,
	useSetRecordInclusion: mocks.useSetRecordInclusion,
}));
vi.mock("#/hooks/components/use-components", () => ({
	useComponents: mocks.useComponents,
}));
vi.mock("#/hooks/meetings/use-participants", () => ({
	useParticipants: mocks.useParticipants,
}));
vi.mock("#/hooks/general-reports/use-general-reports", () => ({
	useGeneralReports: mocks.useGeneralReports,
	useCreateGeneralReport: mocks.useCreateGeneralReport,
	useUpdateGeneralReport: mocks.useUpdateGeneralReport,
}));
vi.mock("#/components/meetings/general-report-form", () => ({
	GeneralReportForm: ({ submitLabel }: { submitLabel: string }) => (
		<form aria-label="Formulário de relato geral">
			<button type="button">{submitLabel}</button>
		</form>
	),
}));
vi.mock("#/components/meetings/transition-buttons", () => ({
	TransitionButtons: () => <div />,
}));

import { CouncilPage } from "./council";

const mutation = (implementation?: (values: unknown) => unknown) => ({
	mutateAsync: vi.fn(implementation ?? (() => Promise.resolve({}))),
	isPending: false,
});

function renderPage() {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	return render(
		<QueryClientProvider client={client}>
			<CouncilPage />
		</QueryClientProvider>,
	);
}

beforeEach(() => {
	mocks.useMeeting.mockReturnValue({
		data: { id: "meeting-1", title: "Conselho", status: "in_progress" },
		isLoading: false,
	});
	mocks.useMeetingClasses.mockReturnValue({
		data: [
			{
				id: "link-1",
				classId: "class-1",
				class: { id: "class-1", name: "Turma A", academicPeriod: "2026" },
			},
		],
		isLoading: false,
	});
	mocks.useMeetingClassStudents.mockReturnValue({
		data: {
			students: [
				{ studentId: "student-1", name: "João", registrationNumber: "123" },
			],
			counters: {},
		},
		isLoading: false,
		isError: false,
	});
	mocks.useMeetingStudentRecords.mockReturnValue({
		data: {
			records: [
				{
					id: "record-1",
					studentId: "student-1",
					texto: "Registro vinculado",
					scope: "vinculado",
					includeInMinutes: true,
					componentId: null,
					originId: null,
					createdAt: "2026-01-01T00:00:00Z",
				},
				{
					id: "record-2",
					studentId: "student-1",
					texto: "Contexto",
					scope: "contexto",
					includeInMinutes: true,
					componentId: null,
					originId: null,
					createdAt: "2026-01-01T00:00:00Z",
				},
			],
		},
		isLoading: false,
		isError: false,
	});
	mocks.useCreateLinkedRecord.mockReturnValue(mutation());
	mocks.useUpdateLinkedRecord.mockReturnValue(mutation());
	mocks.useSetRecordInclusion.mockReturnValue(mutation());
	mocks.useComponents.mockReturnValue({ data: { data: [] } });
	mocks.useParticipants.mockReturnValue({ data: [] });
	mocks.useGeneralReports.mockReturnValue({
		data: [
			{
				id: "report-1",
				texto: "Relato geral",
				originId: null,
				includeInMinutes: true,
				createdAt: "2026-01-01T00:00:00Z",
			},
		],
		isLoading: false,
		isError: false,
	});
	mocks.useCreateGeneralReport.mockReturnValue(mutation());
	mocks.useUpdateGeneralReport.mockReturnValue(mutation());
});

describe("CouncilPage", () => {
	it("renderiza turmas, estudantes e registros sem placeholders", () => {
		renderPage();
		expect(
			screen.getByRole("heading", { name: "Conselho de classe" }),
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Turma A" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "João" })).toBeInTheDocument();
		expect(screen.getByText("Registro vinculado")).toBeInTheDocument();
		expect(screen.getAllByText("Contexto").length).toBeGreaterThan(0);
		expect(screen.getByText("Relato geral")).toBeInTheDocument();
		expect(
			screen.getByRole("form", { name: "Formulário de relato geral" }),
		).toBeInTheDocument();
		expect(screen.queryByText(/spec 0007/i)).not.toBeInTheDocument();
	});

	it("permite criar registro vinculado com texto obrigatório", async () => {
		const mutateAsync = vi.fn(() => Promise.resolve({}));
		mocks.useCreateLinkedRecord.mockReturnValue({
			mutateAsync,
			isPending: false,
		});
		renderPage();
		fireEvent.change(screen.getAllByLabelText("Texto *")[0], {
			target: { value: "Novo registro" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Adicionar registro" }));
		await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
		expect(mutateAsync).toHaveBeenCalledWith(
			expect.objectContaining({
				studentId: "student-1",
				texto: "Novo registro",
				incluirNaAta: true,
			}),
		);
	});

	it("alterna inclusão de registro independente", async () => {
		const mutateAsync = vi.fn(() => Promise.resolve({}));
		mocks.useSetRecordInclusion.mockReturnValue({
			mutateAsync,
			isPending: false,
		});
		renderPage();
		fireEvent.click(screen.getByRole("button", { name: "Remover da ata" }));
		await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
		expect(mutateAsync).toHaveBeenCalledWith(
			expect.objectContaining({ incluir: false }),
		);
	});

	it("edita registro vinculado em reunião em andamento", async () => {
		const mutateAsync = vi.fn(() => Promise.resolve({}));
		mocks.useUpdateLinkedRecord.mockReturnValue({
			mutateAsync,
			isPending: false,
		});
		renderPage();
		fireEvent.click(screen.getAllByRole("button", { name: "Editar" })[0]);
		await waitFor(() =>
			expect(screen.getAllByLabelText("Texto *").length).toBeGreaterThan(1),
		);
		fireEvent.change(screen.getAllByLabelText("Texto *")[1], {
			target: { value: "Registro editado" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Salvar registro" }));
		await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
		expect(mutateAsync).toHaveBeenCalledWith(
			expect.objectContaining({ recordId: "record-1" }),
		);
	});

	it("bloqueia edição quando a reunião está finalizada", () => {
		mocks.useMeeting.mockReturnValue({
			data: { id: "meeting-1", title: "Conselho", status: "finished" },
			isLoading: false,
		});
		renderPage();
		expect(
			screen.getByText(/Reunião finalizada — reabra para editar registros/i),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Adicionar registro" }),
		).toBeDisabled();
		expect(
			screen.getByRole("button", { name: "Remover da ata" }),
		).toBeDisabled();
	});

	it("abre edição de relato geral e exibe estados de carregamento/erro", () => {
		renderPage();
		fireEvent.click(screen.getAllByRole("button", { name: "Editar" })[1]);
		expect(
			screen.getByRole("button", { name: "Salvar relato" }),
		).toBeInTheDocument();
		mocks.useGeneralReports.mockReturnValue({
			data: [],
			isLoading: true,
			isError: false,
		});
		renderPage();
		expect(screen.getByText("Carregando relatos...")).toBeInTheDocument();
		mocks.useGeneralReports.mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: true,
		});
		renderPage();
		expect(
			screen.getByText("Não foi possível carregar os relatos gerais."),
		).toBeInTheDocument();
		mocks.useGeneralReports.mockReturnValue({
			data: [],
			isLoading: false,
			isError: false,
		});
		renderPage();
		expect(screen.getAllByText("Nenhum relato geral.")[0]).toBeInTheDocument();
	});

	it("exibe estados vazios e de erro das turmas e estudantes", () => {
		mocks.useMeetingClasses.mockReturnValue({ data: [], isLoading: false });
		mocks.useMeetingClassStudents.mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: true,
		});
		mocks.useMeetingClasses.mockReturnValue({
			data: [
				{
					id: "link-1",
					classId: "class-1",
					class: { id: "class-1", name: "Turma A" },
				},
			],
			isLoading: false,
		});
		renderPage();
		expect(
			screen.getByText("Não foi possível carregar os estudantes desta turma."),
		).toBeInTheDocument();
	});
});
