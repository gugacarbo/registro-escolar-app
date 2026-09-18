import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
	useParticipantName: vi.fn(),
	useGeneralReports: vi.fn(),
	useCreateGeneralReport: vi.fn(),
	useUpdateGeneralReport: vi.fn(),
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
vi.mock("#/components/meetings/participant-name", () => ({
	useParticipantName: mocks.useParticipantName,
}));
vi.mock("#/hooks/general-reports/use-general-reports", () => ({
	useGeneralReports: mocks.useGeneralReports,
	useCreateGeneralReport: mocks.useCreateGeneralReport,
	useUpdateGeneralReport: mocks.useUpdateGeneralReport,
}));
vi.mock("#/components/meetings/transition-buttons", () => ({
	TransitionButtons: () => <div />,
}));
vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn() },
}));

import { toast } from "sonner";

import CouncilPage from "./council";

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

function mockFetchComponents() {
	vi.spyOn(globalThis, "fetch").mockResolvedValue(
		new Response(
			JSON.stringify({ data: [], total: 0, page: 1, pageSize: 100 }),
		),
	);
}

// A seleção de estudante é explícita: sem clique na lista não há painel.
async function selectStudent(user: ReturnType<typeof userEvent.setup>) {
	await user.click(screen.getByRole("button", { name: "Selecionar João" }));
}

beforeEach(() => {
	localStorage.clear();
	vi.mocked(toast.success).mockReset();
	vi.mocked(toast.error).mockReset();
	mockFetchComponents();
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
				{
					studentId: "student-1",
					name: "João",
					document: null,
					registrationNumber: "123",
					status: "pendente",
					statusUpdatedAt: null,
				},
			],
			counters: {
				total: 1,
				pendente: 1,
				em_discussao: 0,
				concluido: 0,
				nao_discutido: 0,
			},
			nextPendingStudentId: "student-1",
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
	mocks.useParticipantName.mockReturnValue({
		getParticipantName: (id: string) => id,
	});
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
	it("renderiza turmas, estudantes e registros com nova hierarquia", async () => {
		const user = userEvent.setup();
		renderPage();
		await selectStudent(user);
		expect(
			screen.getByRole("heading", { name: "Conselho" }),
		).toBeInTheDocument();
		expect(
			screen.queryByText("Participação na reunião"),
		).not.toBeInTheDocument();
		expect(screen.getByRole("tab", { name: "Turma A" })).toHaveAttribute(
			"data-state",
			"active",
		);
		expect(
			screen.getByRole("heading", { name: /Estudantes da turma/ }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Selecionar João" }),
		).toBeInTheDocument();
		expect(screen.getByText("Registro vinculado")).toBeInTheDocument();
		expect(
			screen.getByRole("tab", { name: /Registros de João/ }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("tab", { name: /Relatos gerais/ }),
		).toBeInTheDocument();
		expect(screen.queryByText(/spec 0007/i)).not.toBeInTheDocument();
	});

	it("posiciona as tabs de turma acima dos dois cards", () => {
		renderPage();

		const classTabs = screen.getByTestId("council-class-tabs");
		const layout = screen.getByTestId("council-layout");

		expect(classTabs.nextElementSibling).toBe(layout);
		expect(screen.getByTestId("council-students-panel")).not.toContainElement(
			classTabs,
		);
	});

	it("apresenta o seletor de turmas como botões sobre um card", () => {
		renderPage();

		const classTabs = screen.getByTestId("council-class-tabs");

		expect(classTabs.querySelector('[data-slot="card"]')).toBeInTheDocument();
		expect(screen.getByTestId("council-class-label")).toHaveTextContent(
			"Turmas",
		);
		const tabList = screen.getByRole("tablist", { name: "Turmas da reunião" });

		expect(tabList).toHaveAttribute("data-variant", "default");
		expect(tabList).toHaveClass("overflow-hidden");
		expect(tabList).not.toHaveClass("overflow-x-auto");
	});

	it("mantém a lista de estudantes contida com rolagem no card", () => {
		renderPage();

		const studentListScroll = screen.getByTestId("student-list-scroll");

		expect(studentListScroll).toHaveClass("max-h-96", "overflow-y-auto");
		expect(
			screen.getByRole("list", { name: "Estudantes da turma" }),
		).toHaveClass("min-w-0");
		expect(screen.getByRole("button", { name: "Selecionar João" })).toHaveClass(
			"min-w-0",
			"overflow-hidden",
		);
	});

	it("organiza estudantes à esquerda e registros à direita", async () => {
		const user = userEvent.setup();
		renderPage();
		await selectStudent(user);

		expect(screen.getByTestId("council-students-panel")).toContainElement(
			screen.getByRole("button", { name: "Selecionar João" }),
		);
		expect(screen.getByTestId("council-records-panel")).toContainElement(
			screen.getByText("Registro vinculado"),
		);
	});

	it("exibe progresso da turma e próximo pendente", () => {
		renderPage();
		expect(screen.getByText("Próximo pendente")).toBeInTheDocument();
		expect(
			screen.getByRole("progressbar", { name: /Progresso da turma/ }),
		).toBeInTheDocument();
		expect(screen.getByText(/0 de 1 concluídos/)).toBeInTheDocument();
	});

	it("filtra estudantes pela busca quando há mais de 5", () => {
		mocks.useMeetingClassStudents.mockReturnValue({
			data: {
				students: Array.from({ length: 6 }, (_, i) => ({
					studentId: `student-${i}`,
					name: `Aluno ${i}`,
					document: null,
					registrationNumber: `${100 + i}`,
					status: "pendente",
					statusUpdatedAt: null,
				})),
				counters: {
					total: 6,
					pendente: 6,
					em_discussao: 0,
					concluido: 0,
					nao_discutido: 0,
				},
				nextPendingStudentId: "student-0",
			},
			isLoading: false,
			isError: false,
		});
		renderPage();
		const search = screen.getByLabelText("Buscar estudante");
		fireEvent.change(search, { target: { value: "Aluno 5" } });
		expect(
			screen.getByRole("button", { name: "Selecionar Aluno 5" }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Selecionar Aluno 0" }),
		).not.toBeInTheDocument();
	});

	it("permite criar registro vinculado via Dialog", async () => {
		const user = userEvent.setup();
		const mutateAsync = vi.fn(() => Promise.resolve({}));
		mocks.useCreateLinkedRecord.mockReturnValue({
			mutateAsync,
			isPending: false,
		});
		renderPage();
		await selectStudent(user);
		await user.click(screen.getByRole("button", { name: "Novo registro" }));
		expect(
			screen.getByRole("dialog", { name: /Novo registro de João/ }),
		).toBeInTheDocument();
		await user.type(screen.getByLabelText("Texto *"), "Novo registro");
		await user.click(
			screen.getByRole("button", { name: "Adicionar registro" }),
		);
		await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
		expect(mutateAsync).toHaveBeenCalledWith(
			expect.objectContaining({
				studentId: "student-1",
				texto: "Novo registro",
				incluirNaAta: true,
			}),
		);
		expect(toast.success).toHaveBeenCalledWith("Registro criado");
	});

	it("exibe empty state com CTA quando sem registros", async () => {
		const user = userEvent.setup();
		mocks.useMeetingStudentRecords.mockReturnValue({
			data: { records: [] },
			isLoading: false,
			isError: false,
		});
		renderPage();
		await selectStudent(user);
		expect(
			screen.getByText("Nenhum registro para este estudante"),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Adicionar o primeiro registro" }),
		).toBeInTheDocument();
	});

	it("alterna inclusão de registro de histórico via Switch", async () => {
		const user = userEvent.setup();
		const mutateAsync = vi.fn(() => Promise.resolve({}));
		mocks.useSetRecordInclusion.mockReturnValue({
			mutateAsync,
			isPending: false,
		});
		renderPage();
		await selectStudent(user);
		const toggle = screen.getByRole("switch", {
			name: 'Remover registro "Contexto" na ata',
		});
		await user.click(toggle);
		await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
		expect(mutateAsync).toHaveBeenCalledWith(
			expect.objectContaining({ incluir: false }),
		);
	});

	it("edita registro vinculado em reunião em andamento", async () => {
		const user = userEvent.setup();
		const mutateAsync = vi.fn(() => Promise.resolve({}));
		mocks.useUpdateLinkedRecord.mockReturnValue({
			mutateAsync,
			isPending: false,
		});
		renderPage();
		await selectStudent(user);
		const editButtons = screen.getAllByRole("button", { name: "Editar" });
		await user.click(editButtons[0]);
		await waitFor(() =>
			expect(
				screen.getByRole("button", { name: "Salvar registro" }),
			).toBeInTheDocument(),
		);
		const textInputs = screen.getAllByLabelText("Texto *");
		fireEvent.change(textInputs[textInputs.length - 1], {
			target: { value: "Registro editado" },
		});
		await user.click(screen.getByRole("button", { name: "Salvar registro" }));
		await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
		expect(mutateAsync).toHaveBeenCalledWith(
			expect.objectContaining({ recordId: "record-1" }),
		);
		expect(toast.success).toHaveBeenCalledWith("Registro atualizado");
	});

	it("bloqueia edição quando a reunião está finalizada", async () => {
		const user = userEvent.setup();
		mocks.useMeeting.mockReturnValue({
			data: { id: "meeting-1", title: "Conselho", status: "finished" },
			isLoading: false,
		});
		renderPage();
		await selectStudent(user);
		expect(
			screen.getByText(/Reunião finalizada — reabra para editar registros/i),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Novo registro" }),
		).not.toBeInTheDocument();
		expect(
			screen.getByRole("switch", {
				name: 'Remover registro "Contexto" na ata',
			}),
		).toBeDisabled();
	});

	it("navega para a aba de relatos e cria relato geral", async () => {
		const user = userEvent.setup();
		const createReport = vi.fn(() => Promise.resolve({}));
		mocks.useCreateGeneralReport.mockReturnValue({
			mutateAsync: createReport,
			isPending: false,
		});
		renderPage();
		await selectStudent(user);
		await user.click(screen.getByRole("tab", { name: /Relatos gerais/ }));
		expect(screen.getByText("Relato geral")).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Novo relato geral" }));
		await user.type(screen.getAllByLabelText("Texto *")[0], "Novo relato");
		await user.click(screen.getByRole("button", { name: "Adicionar relato" }));
		await waitFor(() => expect(createReport).toHaveBeenCalled());
		expect(toast.success).toHaveBeenCalledWith("Relato criado");
	});

	it("abre edição de relato geral e exibe estados de carregamento/erro", async () => {
		const user = userEvent.setup();
		renderPage();
		await selectStudent(user);
		await user.click(screen.getByRole("tab", { name: /Relatos gerais/ }));
		await user.click(screen.getByRole("button", { name: "Editar" }));
		expect(
			screen.getByRole("button", { name: "Salvar relato" }),
		).toBeInTheDocument();

		// Alterna de aba para forçar o re-render de estados do relato.
		async function toggleToReportsTab() {
			await user.click(screen.getByRole("tab", { name: /Registros de João/ }));
			await user.click(screen.getByRole("tab", { name: /Relatos gerais/ }));
		}

		mocks.useGeneralReports.mockReturnValue({
			data: [],
			isLoading: true,
			isError: false,
		});
		await toggleToReportsTab();
		expect(screen.getAllByText("Carregando relatos...").length).toBeGreaterThan(
			0,
		);
		mocks.useGeneralReports.mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: true,
		});
		await toggleToReportsTab();
		expect(
			screen.getByText("Não foi possível carregar os relatos gerais."),
		).toBeInTheDocument();
		mocks.useGeneralReports.mockReturnValue({
			data: [],
			isLoading: false,
			isError: false,
		});
		await toggleToReportsTab();
		expect(screen.getByText("Nenhum relato geral")).toBeInTheDocument();
	});

	it("exibe vazio de turmas, loading e vazio de busca de estudantes", () => {
		mocks.useMeetingClasses.mockReturnValue({ data: [], isLoading: false });
		mocks.useMeetingClassStudents.mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: false,
		});
		const { unmount } = renderPage();
		expect(
			screen.getByText("Nenhuma turma vinculada a esta reunião."),
		).toBeInTheDocument();
		unmount();
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
		mocks.useMeetingClassStudents.mockReturnValue({
			data: {
				students: [
					{
						studentId: "student-1",
						name: "João",
						document: null,
						registrationNumber: "123",
						status: "pendente",
						statusUpdatedAt: null,
					},
				],
				counters: {
					total: 1,
					pendente: 1,
					em_discussao: 0,
					concluido: 0,
					nao_discutido: 0,
				},
				nextPendingStudentId: "student-1",
			},
			isLoading: true,
			isError: false,
		});
		{
			const { unmount: unmountLoading } = renderPage();
			expect(screen.getByText("Carregando estudantes...")).toBeInTheDocument();
			unmountLoading();
		}
		mocks.useMeetingClassStudents.mockReturnValue({
			data: {
				students: Array.from({ length: 6 }, (_, i) => ({
					studentId: `student-${i}`,
					name: `Aluno ${i}`,
					document: null,
					registrationNumber: `${300 + i}`,
					status: "pendente",
					statusUpdatedAt: null,
				})),
				counters: {
					total: 6,
					pendente: 6,
					em_discussao: 0,
					concluido: 0,
					nao_discutido: 0,
				},
				nextPendingStudentId: "student-0",
			},
			isLoading: false,
			isError: false,
		});
		renderPage();
		fireEvent.change(screen.getByLabelText("Buscar estudante"), {
			target: { value: "zzz-sem-match" },
		});
		expect(
			screen.getByText("Nenhum estudante encontrado para “zzz-sem-match”."),
		).toBeInTheDocument();
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
		expect(screen.getByRole("tab", { name: "Turma B" })).toBeInTheDocument();
		expect(screen.getByRole("tab", { name: "class-3" })).toBeInTheDocument();
		fireEvent.click(screen.getByRole("tab", { name: "Turma B" }));
		expect(mocks.useMeetingClassStudents).toHaveBeenLastCalledWith(
			"meeting-1",
			"class-2",
		);
	});

	it("filtra por matrícula e usa fallback do primeiro pendente ao trocar de turma", async () => {
		const user = userEvent.setup();
		mocks.useMeetingClassStudents.mockReturnValue({
			data: {
				students: [
					{
						studentId: "student-1",
						name: "João",
						document: null,
						registrationNumber: "123",
						status: "pendente",
						statusUpdatedAt: null,
					},
					{
						studentId: "student-2",
						name: "Ana",
						document: null,
						registrationNumber: null,
						status: "pendente",
						statusUpdatedAt: null,
					},
				],
				counters: {
					total: 2,
					pendente: 2,
					em_discussao: 0,
					concluido: 0,
					nao_discutido: 0,
				},
				nextPendingStudentId: null,
			},
			isLoading: false,
			isError: false,
		});
		mocks.useMeetingClasses.mockReturnValue({
			data: [
				{
					id: "link-1",
					classId: "class-1",
					class: { id: "class-1", name: "Turma A", academicPeriod: "2026" },
				},
				{
					id: "link-2",
					classId: "class-2",
					class: { id: "class-2", name: "Turma B", academicPeriod: "2026" },
				},
			],
			isLoading: false,
		});
		renderPage();
		const turmas = Array.from({ length: 6 }, (_, i) => ({
			studentId: `s-${i}`,
			name: `Aluno ${i}`,
			document: null,
			registrationNumber: `${200 + i}`,
			status: "pendente",
			statusUpdatedAt: null,
		}));
		mocks.useMeetingClassStudents.mockReturnValue({
			data: {
				students: turmas,
				counters: {
					total: 6,
					pendente: 6,
					em_discussao: 0,
					concluido: 0,
					nao_discutido: 0,
				},
				nextPendingStudentId: null,
			},
			isLoading: false,
			isError: false,
		});
		await user.click(screen.getByRole("tab", { name: "Turma B" }));
		const searchInput = await screen.findByLabelText("Buscar estudante");
		fireEvent.change(searchInput, {
			target: { value: "205" },
		});
		expect(
			screen.getByRole("button", { name: "Selecionar Aluno 5" }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Selecionar Aluno 0" }),
		).not.toBeInTheDocument();
	});

	it("exibe matrícula e troca de estudante", () => {
		renderPage();
		expect(screen.getByText("Matrícula 123")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Selecionar João" }));
		expect(mocks.useMeetingStudentRecords).toHaveBeenLastCalledWith(
			"meeting-1",
			"student-1",
		);
	});

	it("exibe loading/erro/vazio de registros e erro de servidor", async () => {
		const user = userEvent.setup();
		mocks.useMeetingStudentRecords.mockReturnValue({
			data: undefined,
			isLoading: true,
			isError: false,
		});
		const { rerender } = renderPage();
		await selectStudent(user);
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

	it("mostra mensagem específica para rascunho", async () => {
		const user = userEvent.setup();
		mocks.useMeeting.mockReturnValue({
			data: { id: "meeting-1", title: "Conselho", status: "draft" },
			isLoading: false,
		});
		renderPage();
		await selectStudent(user);
		expect(
			screen.getByText("Inicie a reunião para criar registros vinculados."),
		).toBeInTheDocument();
	});

	it("exige seleção explícita de estudante antes de exibir o painel", () => {
		renderPage();
		expect(
			screen.getByText("Nenhum estudante selecionado"),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("tab", { name: /Registros de João/ }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Novo registro" }),
		).not.toBeInTheDocument();
	});
});

describe("CouncilPage erros de mutação", () => {
	it("exibe erro ao editar relato", async () => {
		const user = userEvent.setup();
		const updateReport = vi.fn(() =>
			Promise.reject(new Error("Erro ao editar relato")),
		);
		mocks.useUpdateGeneralReport.mockReturnValue({
			mutateAsync: updateReport,
			isPending: false,
		});
		renderPage();
		await selectStudent(user);
		await user.click(screen.getByRole("tab", { name: /Relatos gerais/ }));
		await user.click(screen.getByRole("button", { name: "Editar" }));
		await user.click(screen.getByRole("button", { name: "Salvar relato" }));
		await waitFor(() => expect(updateReport).toHaveBeenCalled());
		expect(
			await screen.findByText("Erro ao editar relato"),
		).toBeInTheDocument();
	});

	it("exibe erro ao criar relato", async () => {
		const user = userEvent.setup();
		const createReport = vi.fn(() =>
			Promise.reject(new Error("Erro ao criar relato")),
		);
		mocks.useCreateGeneralReport.mockReturnValue({
			mutateAsync: createReport,
			isPending: false,
		});
		renderPage();
		await selectStudent(user);
		await user.click(screen.getByRole("tab", { name: /Relatos gerais/ }));
		await user.click(screen.getByRole("button", { name: "Novo relato geral" }));
		await user.type(screen.getAllByLabelText("Texto *")[0], "Relato com erro");
		await user.click(screen.getByRole("button", { name: "Adicionar relato" }));
		await waitFor(() => expect(createReport).toHaveBeenCalled());
		expect(await screen.findByText("Erro ao criar relato")).toBeInTheDocument();
	});

	it("exibe erro ao criar registro", async () => {
		const user = userEvent.setup();
		const createRecord = vi.fn(() =>
			Promise.reject(new Error("Erro ao criar registro")),
		);
		mocks.useCreateLinkedRecord.mockReturnValue({
			mutateAsync: createRecord,
			isPending: false,
		});
		renderPage();
		await selectStudent(user);
		await user.click(screen.getByRole("button", { name: "Novo registro" }));
		await user.type(screen.getByLabelText("Texto *"), "Novo registro");
		await user.click(
			screen.getByRole("button", { name: "Adicionar registro" }),
		);
		await waitFor(() => expect(createRecord).toHaveBeenCalled());
		expect(
			await screen.findByText("Erro ao criar registro"),
		).toBeInTheDocument();
	});
});

describe("CouncilPage mutações de relato bem-sucedidas", () => {
	it("cria relato geral", async () => {
		const user = userEvent.setup();
		const createReport = vi.fn(() => Promise.resolve({}));
		mocks.useCreateGeneralReport.mockReturnValue({
			mutateAsync: createReport,
			isPending: false,
		});
		renderPage();
		await selectStudent(user);
		await user.click(screen.getByRole("tab", { name: /Relatos gerais/ }));
		await user.click(screen.getByRole("button", { name: "Novo relato geral" }));
		await user.type(screen.getAllByLabelText("Texto *")[0], "Relato novo");
		await user.click(screen.getByRole("button", { name: "Adicionar relato" }));
		await waitFor(() => expect(createReport).toHaveBeenCalled());
	});

	it("edita relato geral e fecha o formulário", async () => {
		const user = userEvent.setup();
		const updateReport = vi.fn(() => Promise.resolve({}));
		mocks.useUpdateGeneralReport.mockReturnValue({
			mutateAsync: updateReport,
			isPending: false,
		});
		renderPage();
		await selectStudent(user);
		await user.click(screen.getByRole("tab", { name: /Relatos gerais/ }));
		await user.click(screen.getByRole("button", { name: "Editar" }));
		await user.click(screen.getByRole("button", { name: "Salvar relato" }));
		await waitFor(() => expect(updateReport).toHaveBeenCalled());
		expect(toast.success).toHaveBeenCalledWith("Relato atualizado");
		await waitFor(() =>
			expect(
				screen.queryByRole("button", { name: "Salvar relato" }),
			).not.toBeInTheDocument(),
		);
	});
});

describe("CouncilPage erros de registros", () => {
	it("exibe erro ao editar registro vinculado", async () => {
		const user = userEvent.setup();
		const updateRecord = vi.fn(() =>
			Promise.reject(new Error("Erro ao editar registro")),
		);
		mocks.useUpdateLinkedRecord.mockReturnValue({
			mutateAsync: updateRecord,
			isPending: false,
		});
		renderPage();
		await selectStudent(user);
		await user.click(screen.getByRole("button", { name: "Editar" }));
		await user.click(screen.getByRole("button", { name: "Salvar registro" }));
		await waitFor(() => expect(updateRecord).toHaveBeenCalled());
		expect(
			await screen.findByText("Erro ao editar registro"),
		).toBeInTheDocument();
	});

	it("exibe erro ao alterar inclusão", async () => {
		const user = userEvent.setup();
		const inclusion = vi.fn(() =>
			Promise.reject(new Error("Erro ao alterar inclusão")),
		);
		mocks.useSetRecordInclusion.mockReturnValue({
			mutateAsync: inclusion,
			isPending: false,
		});
		renderPage();
		await selectStudent(user);
		const toggle = screen.getByRole("switch", {
			name: 'Remover registro "Contexto" na ata',
		});
		await user.click(toggle);
		await waitFor(() => expect(inclusion).toHaveBeenCalled());
		expect(
			await screen.findByText("Erro ao alterar inclusão"),
		).toBeInTheDocument();
	});
});

describe("CouncilPage variações de registro", () => {
	it("rendera registro interno, sem matrícula e estados de turma", async () => {
		const user = userEvent.setup();
		mocks.useMeetingClassStudents.mockReturnValue({
			data: {
				students: [
					{
						studentId: "student-1",
						name: "João",
						document: null,
						registrationNumber: null,
						status: "pendente",
						statusUpdatedAt: null,
					},
				],
				counters: {
					total: 1,
					pendente: 1,
					em_discussao: 0,
					concluido: 0,
					nao_discutido: 0,
				},
				nextPendingStudentId: "student-1",
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
		await selectStudent(user);
		expect(screen.getAllByText("Interno").length).toBeGreaterThan(1);
		expect(screen.queryByText(/Matrícula/)).not.toBeInTheDocument();
		expect(
			screen.getByRole("switch", {
				name: 'Incluir registro "Contexto interno" na ata',
			}),
		).toBeInTheDocument();
	});
});
