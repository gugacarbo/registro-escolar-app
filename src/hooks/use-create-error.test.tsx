import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useCreateClass } from "./classes/use-create-class";
import { useCreateComponent } from "./components/use-create-component";
import { useCreateEnrollment } from "./enrollments/use-create-enrollment";
import { useCreateMeeting } from "./meetings/use-create-meeting";
import { useCreateMinuteTemplate } from "./minutes/use-create-minute-template";
import { useCreateOffer } from "./offers/use-create-offer";
import { useCreateRole } from "./roles/use-create-role";
import { useCreateStaff } from "./staff/use-create-staff";
import { useCreateStudent } from "./students/use-create-student";

function wrapper({ children }: { children: ReactNode }) {
	return (
		<QueryClientProvider
			client={
				new QueryClient({
					defaultOptions: {
						queries: { retry: false },
						mutations: { retry: false },
					},
				})
			}
		>
			{children}
		</QueryClientProvider>
	);
}

type MutationLike = {
	mutate: (variables: unknown) => void;
	isError: boolean;
	error?: Error;
};

afterEach(() => vi.restoreAllMocks());

describe("hooks de criação", () => {
	it("propaga mensagens específicas do servidor", async () => {
		vi.spyOn(globalThis, "fetch").mockImplementation(
			async () =>
				new Response(JSON.stringify({ error: "Registro duplicado" }), {
					status: 409,
				}),
		);
		const hooks = [
			() => useCreateClass(),
			() => useCreateComponent(),
			() => useCreateEnrollment(),
			() => useCreateMeeting(),
			() => useCreateMinuteTemplate(),
			() => useCreateOffer(),
			() => useCreateRole(),
			() => useCreateStaff(),
			() => useCreateStudent(),
		];
		for (const useHook of hooks) {
			const { result } = renderHook<MutationLike, void>(
				() => (useHook as unknown as () => MutationLike)(),
				{
					wrapper,
				},
			);
			result.current.mutate({
				nome: "Teste",
				name: "Teste",
				title: "Teste",
				estudanteId: "student-1",
				turmaId: "class-1",
				componenteId: "component-1",
				professorIds: [],
				modelo: "Modelo",
			} as never);
			await waitFor(() => expect(result.current.isError).toBe(true));
			expect(result.current.error?.message).toBe("Registro duplicado");
		}
	});

	it("usa mensagens padrão quando o corpo de erro não traz error", async () => {
		vi.spyOn(globalThis, "fetch").mockImplementation(
			async () => new Response(JSON.stringify({}), { status: 500 }),
		);
		const hooks = [
			() => useCreateClass(),
			() => useCreateComponent(),
			() => useCreateEnrollment(),
			() => useCreateMeeting(),
			() => useCreateMinuteTemplate(),
			() => useCreateOffer(),
			() => useCreateRole(),
			() => useCreateStaff(),
			() => useCreateStudent(),
		];
		const expected = [
			"Falha ao criar turma",
			"Falha ao criar componente",
			"Falha ao matricular estudante",
			"Falha ao criar reunião",
			"Falha ao criar modelo de ata",
			"Falha ao criar oferta",
			"Falha ao criar cargo",
			"Falha ao criar servidor",
			"Falha ao criar estudante",
		];
		for (const [index, useHook] of hooks.entries()) {
			const { result } = renderHook<MutationLike, void>(
				() => (useHook as unknown as () => MutationLike)(),
				{
					wrapper,
				},
			);
			result.current.mutate({
				nome: "Teste",
				name: "Teste",
				title: "Teste",
				estudanteId: "student-1",
				turmaId: "class-1",
				componenteId: "component-1",
				professorIds: [],
				modelo: "Modelo",
			} as never);
			await waitFor(() => expect(result.current.isError).toBe(true));
			expect(result.current.error?.message).toBe(expected[index]);
		}
	});
});
