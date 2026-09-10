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
	GeneralReportForm: ({
		submitLabel,
		onSubmit,
	}: {
		submitLabel: string;
		onSubmit: (values: {
			texto: string;
			origemId: string | null;
			incluirNaAta: boolean;
		}) => void | Promise<void>;
	}) => (
		<form aria-label="Formulário de relato geral">
			<button
				type="button"
				onClick={() =>
					onSubmit({ texto: "Relato", origemId: null, incluirNaAta: true })
				}
			>
				{submitLabel}
			</button>
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
					categoriaId: null,
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
					categoriaId: null,
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

describe("CouncilPage estados adicionais", () => {
	it("exibe loading da reunião e das turmas", () => {
		mocks.useMeeting.mockReturnValue({ data: undefined, isLoading: true });
		mocks.useMeetingClasses.mockReturnValue({
			data: undefined,
			isLoading: true,
		});
		mocks.useMeetingClassStudents.mockReturnValue({
			data: undefined,
			isLoading: true,
			isError: false,
		});
		renderPage();
		expect(screen.getByText("Carregando...")).toBeInTheDocument();
	});

	it("usa nome da turma quando ausente e ID quando fallback", () => {
		mocks.useMeetingClasses.mockReturnValue({
			data: [
				{
					id: "link-2",
					classId: "class-2",
					class: { id: "class-2", name: "Turma B" },
				},
				{ id: "link-3", classId: "class-3" },
			],
			isLoading: false,
		});
		renderPage();
		expect(screen.getByRole("button", { name: "Turma B" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "class-3" })).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Turma B" }));
		expect(mocks.useMeetingClassStudents).toHaveBeenLastCalledWith(
			"meeting-1",
			"class-2",
		);
	});

	it("exibe matrícula, estados de registro e troca de estudante", () => {
		renderPage();
		expect(screen.getByText("Matrícula 123")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "João" }));
		expect(mocks.useMeetingStudentRecords).toHaveBeenLastCalledWith(
			"meeting-1",
			"student-1",
		);
	});

	it("exibe loading/erro/vazio de registros e erro de servidor", () => {
		mocks.useMeetingStudentRecords.mockReturnValue({
			data: undefined,
			isLoading: true,
			isError: false,
		});
		const { rerender } = renderPage();
		expect(
			screen.queryByText(/Nenhum registro para este estudante/),
		).not.toBeInTheDocument();
		mocks.useMeetingStudentRecords.mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: true,
		});
		rerender(
			<QueryClientProvider client={new QueryClient()}>
				<CouncilPage />
			</QueryClientProvider>,
		);
		expect(
			screen.getByText("Não foi possível carregar os registros."),
		).toBeInTheDocument();
		mocks.useMeetingStudentRecords.mockReturnValue({
			data: { records: [] },
			isLoading: false,
			isError: false,
		});
		rerender(
			<QueryClientProvider client={new QueryClient()}>
				<CouncilPage />
			</QueryClientProvider>,
		);
		expect(
			screen.getByText(/Nenhum registro para este estudante/),
		).toBeInTheDocument();
	});

	it("mostra mensagem específica para rascunho", () => {
		mocks.useMeeting.mockReturnValue({
			data: { id: "meeting-1", title: "Conselho", status: "draft" },
			isLoading: false,
		});
		renderPage();
		expect(
			screen.getByText("Inicie a reunião para criar registros vinculados."),
		).toBeInTheDocument();
	});
});

describe("CouncilPage erros de mutação", () => {
	it("exibe erro ao editar relato", async () => {
		const updateReport = vi.fn(() =>
			Promise.reject(new Error("Erro ao editar relato")),
		);
		mocks.useUpdateGeneralReport.mockReturnValue({
			mutateAsync: updateReport,
			isPending: false,
		});
		renderPage();
		fireEvent.click(screen.getAllByRole("button", { name: "Editar" })[1]);
		fireEvent.click(screen.getByRole("button", { name: "Salvar relato" }));
		await waitFor(() => expect(updateReport).toHaveBeenCalled());
		expect(
			await screen.findByText("Erro ao editar relato"),
		).toBeInTheDocument();
	});

	it("exibe erro ao criar relato", async () => {
		const createReport = vi.fn(() =>
			Promise.reject(new Error("Erro ao criar relato")),
		);
		mocks.useCreateGeneralReport.mockReturnValue({
			mutateAsync: createReport,
			isPending: false,
		});
		renderPage();
		fireEvent.click(screen.getByRole("button", { name: "Adicionar relato" }));
		await waitFor(() => expect(createReport).toHaveBeenCalled());
		expect(await screen.findByText("Erro ao criar relato")).toBeInTheDocument();
	});

	it("exibe erro ao criar registro", async () => {
		const createRecord = vi.fn(() =>
			Promise.reject(new Error("Erro ao criar registro")),
		);
		mocks.useCreateLinkedRecord.mockReturnValue({
			mutateAsync: createRecord,
			isPending: false,
		});
		renderPage();
		fireEvent.change(screen.getAllByLabelText("Texto *")[0], {
			target: { value: "Novo registro" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Adicionar registro" }));
		await waitFor(() => expect(createRecord).toHaveBeenCalled());
		expect(
			await screen.findByText("Erro ao criar registro"),
		).toBeInTheDocument();
	});
});

describe("CouncilPage mutações de relato bem-sucedidas", () => {
	it("cria relato geral", async () => {
		const createReport = vi.fn(() => Promise.resolve({}));
		mocks.useCreateGeneralReport.mockReturnValue({
			mutateAsync: createReport,
			isPending: false,
		});
		renderPage();
		fireEvent.click(screen.getByRole("button", { name: "Adicionar relato" }));
		await waitFor(() => expect(createReport).toHaveBeenCalled());
	});

	it("edita relato geral e fecha o formulário", async () => {
		const updateReport = vi.fn(() => Promise.resolve({}));
		mocks.useUpdateGeneralReport.mockReturnValue({
			mutateAsync: updateReport,
			isPending: false,
		});
		renderPage();
		fireEvent.click(screen.getAllByRole("button", { name: "Editar" })[1]);
		fireEvent.click(screen.getByRole("button", { name: "Salvar relato" }));
		await waitFor(() => expect(updateReport).toHaveBeenCalled());
		await waitFor(() =>
			expect(
				screen.queryByRole("button", { name: "Salvar relato" }),
			).not.toBeInTheDocument(),
		);
	});
});

describe("CouncilPage erros de registros", () => {
	it("exibe erro ao editar registro vinculado", async () => {
		const updateRecord = vi.fn(() =>
			Promise.reject(new Error("Erro ao editar registro")),
		);
		mocks.useUpdateLinkedRecord.mockReturnValue({
			mutateAsync: updateRecord,
			isPending: false,
		});
		renderPage();
		fireEvent.click(screen.getAllByRole("button", { name: "Editar" })[0]);
		fireEvent.click(screen.getByRole("button", { name: "Salvar registro" }));
		await waitFor(() => expect(updateRecord).toHaveBeenCalled());
		expect(
			await screen.findByText("Erro ao editar registro"),
		).toBeInTheDocument();
	});

	it("exibe erro ao alterar inclusão", async () => {
		const inclusion = vi.fn(() =>
			Promise.reject(new Error("Erro ao alterar inclusão")),
		);
		mocks.useSetRecordInclusion.mockReturnValue({
			mutateAsync: inclusion,
			isPending: false,
		});
		renderPage();
		fireEvent.click(screen.getByRole("button", { name: "Remover da ata" }));
		await waitFor(() => expect(inclusion).toHaveBeenCalled());
		expect(
			await screen.findByText("Erro ao alterar inclusão"),
		).toBeInTheDocument();
	});
});

describe("CouncilPage variações de registro", () => {
	it("rendera registro interno, sem matrícula e estados de turma", () => {
		mocks.useMeetingClassStudents.mockReturnValue({
			data: {
				students: [
					{ studentId: "student-1", name: "João", registrationNumber: null },
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
						texto: "Registro interno",
						scope: "vinculado",
						includeInMinutes: false,
						categoriaId: null,
						componentId: null,
						originId: null,
						createdAt: "2026-01-01T00:00:00Z",
					},
					{
						id: "record-2",
						studentId: "student-1",
						texto: "Contexto interno",
						scope: "contexto",
						includeInMinutes: false,
						categoriaId: null,
						componentId: null,
						originId: null,
						createdAt: "2026-01-01T00:00:00Z",
					},
				],
			},
			isLoading: false,
			isError: false,
		});
		renderPage();
		expect(screen.getAllByText("Interno").length).toBeGreaterThan(1);
		expect(screen.queryByText(/Matrícula/)).not.toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Incluir na ata" }),
		).toBeInTheDocument();
	});
});
