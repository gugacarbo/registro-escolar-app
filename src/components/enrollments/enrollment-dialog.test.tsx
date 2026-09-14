import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	mutateAsync: vi.fn(),
}));

vi.mock("#/hooks/enrollments/use-create-enrollment", () => ({
	useCreateEnrollment: () => ({
		mutateAsync: mocks.mutateAsync,
		isPending: false,
	}),
}));

import { EnrollmentDialog } from "./enrollment-dialog";

function fetchJson(
	data: unknown,
	total = Array.isArray(data) ? data.length : 0,
) {
	return new Response(JSON.stringify({ data, total, page: 1, pageSize: 100 }), {
		status: 200,
	});
}

function renderDialog(props: React.ComponentProps<typeof EnrollmentDialog>) {
	return render(
		<QueryClientProvider
			client={
				new QueryClient({
					defaultOptions: { queries: { retry: false } },
				})
			}
		>
			<EnrollmentDialog {...props} />
		</QueryClientProvider>,
	);
}

beforeEach(() => {
	mocks.mutateAsync.mockReset();
	mocks.mutateAsync.mockResolvedValue({
		enrollment: {},
		closedEnrollments: [],
	});
	vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
		const url = typeof input === "string" ? input : String(input);
		if (url.startsWith("/api/students")) {
			return fetchJson([
				{ id: "student-1", name: "Ana" },
				{ id: "student-2", name: "Bruno" },
			]);
		}
		return fetchJson([
			{ id: "class-1", name: "Turma A", academicPeriod: "2026" },
		]);
	});
});

describe("EnrollmentDialog", () => {
	it("seleciona vários estudantes da turma e cria uma matrícula para cada um", async () => {
		const user = userEvent.setup();
		renderDialog({
			defaultTurmaId: "class-1",
			turmaName: "Turma A",
			trigger: <button type="button">Matricular alunos</button>,
		});

		await user.click(screen.getByRole("button", { name: "Matricular alunos" }));
		await user.click(await screen.findByRole("checkbox", { name: "Ana" }));
		await user.click(await screen.findByRole("checkbox", { name: "Bruno" }));
		await user.type(screen.getByLabelText("Data de início *"), "2026-02-01");
		await user.click(
			screen.getByRole("button", { name: "Matricular 2 estudantes" }),
		);

		expect(mocks.mutateAsync).toHaveBeenNthCalledWith(1, {
			estudanteId: "student-1",
			turmaId: "class-1",
			dataInicio: "2026-02-01",
			status: "ativa",
		});
		expect(mocks.mutateAsync).toHaveBeenNthCalledWith(2, {
			estudanteId: "student-2",
			turmaId: "class-1",
			dataInicio: "2026-02-01",
			status: "ativa",
		});
	});

	it("matricula diretamente o estudante ao escolher uma turma", async () => {
		const user = userEvent.setup();
		renderDialog({
			defaultEstudanteId: "student-1",
			estudanteName: "Ana",
			trigger: <button type="button">Matricular na turma</button>,
		});

		await user.click(
			screen.getByRole("button", { name: "Matricular na turma" }),
		);
		await user.click(screen.getByLabelText("Turma"));
		await user.click(
			await screen.findByRole("option", { name: "Turma A — 2026" }),
		);
		await user.type(screen.getByLabelText("Data de início *"), "2026-02-01");
		await user.click(
			screen.getByRole("button", { name: "Matricular estudante" }),
		);

		expect(mocks.mutateAsync).toHaveBeenCalledWith({
			estudanteId: "student-1",
			turmaId: "class-1",
			dataInicio: "2026-02-01",
			status: "ativa",
		});
	});

	it("oculta turmas em que o estudante já tem vínculo ativo", async () => {
		const user = userEvent.setup();
		renderDialog({
			defaultEstudanteId: "student-1",
			excludedTurmaIds: ["class-1"],
			trigger: <button type="button">Matricular na turma</button>,
		});

		await user.click(
			screen.getByRole("button", { name: "Matricular na turma" }),
		);
		await user.click(screen.getByLabelText("Turma"));

		expect(
			await screen.findByText("Nenhum turma encontrado para a busca."),
		).toBeInTheDocument();
	});

	it("oculta estudantes que já estão ativos na turma", async () => {
		const user = userEvent.setup();
		renderDialog({
			defaultTurmaId: "class-1",
			excludedStudentIds: ["student-1"],
			trigger: <button type="button">Matricular alunos</button>,
		});

		await user.click(screen.getByRole("button", { name: "Matricular alunos" }));

		expect(
			screen.queryByRole("checkbox", { name: "Ana" }),
		).not.toBeInTheDocument();
		expect(
			await screen.findByRole("checkbox", { name: "Bruno" }),
		).toBeInTheDocument();
	});
});
