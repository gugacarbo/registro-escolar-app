import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	navigate: vi.fn(),
	mutateAsync: vi.fn(),
	toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => () => ({}),
	useNavigate: () => mocks.navigate,
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

vi.mock("sonner", () => ({ toast: mocks.toast }));

vi.mock("#/hooks/enrollments/use-create-enrollment", () => ({
	useCreateEnrollment: () => ({ mutateAsync: mocks.mutateAsync }),
}));

vi.mock("#/components/enrollments/enrollment-form", () => ({
	EnrollmentForm: (props: {
		onSubmit: (values: unknown) => Promise<void>;
		serverError?: string | null;
	}) => (
		<div>
			{props.serverError ? (
				<p className="text-sm text-destructive">{props.serverError}</p>
			) : null}
			<button
				type="button"
				onClick={() =>
					props.onSubmit({
						estudanteId: "s1",
						turmaId: "c1",
						dataInicio: "2026-03-01",
						dataTermino: "",
						status: "ativa",
					})
				}
			>
				fake-enroll
			</button>
		</div>
	),
}));

import EnrollPage from "./enroll";

beforeEach(() => {
	mocks.navigate.mockReset();
	mocks.toast.success.mockReset();
	mocks.mutateAsync.mockReset();
	mocks.mutateAsync.mockResolvedValue({
		enrollment: {},
		closedEnrollments: [],
	});
});

describe("EnrollPage", () => {
	it("matricula, notifica e navega para a turma", async () => {
		const user = userEvent.setup();
		render(
			<QueryClientProvider
				client={
					new QueryClient({
						defaultOptions: { mutations: { retry: false } },
					})
				}
			>
				<EnrollPage />
			</QueryClientProvider>,
		);

		await user.click(screen.getByRole("button", { name: "fake-enroll" }));

		expect(mocks.mutateAsync).toHaveBeenCalledTimes(1);
		expect(mocks.mutateAsync).toHaveBeenCalledWith({
			estudanteId: "s1",
			turmaId: "c1",
			dataInicio: "2026-03-01",
			status: "ativa",
		});
		expect(mocks.toast.success).toHaveBeenCalledWith("Estudante matriculado");
		expect(mocks.navigate).toHaveBeenCalledWith({
			to: "/classes/$id/students",
			params: { id: "c1" },
		});
	});

	it("exibe o erro vindo do servidor sem navegar", async () => {
		mocks.mutateAsync.mockRejectedValue(new Error("Vínculo sobreposto"));
		const user = userEvent.setup();
		render(
			<QueryClientProvider
				client={
					new QueryClient({
						defaultOptions: { mutations: { retry: false } },
					})
				}
			>
				<EnrollPage />
			</QueryClientProvider>,
		);

		await user.click(screen.getByRole("button", { name: "fake-enroll" }));

		expect(await screen.findByText("Vínculo sobreposto")).toBeInTheDocument();
		expect(mocks.toast.success).not.toHaveBeenCalled();
		expect(mocks.navigate).not.toHaveBeenCalled();
	});
});
