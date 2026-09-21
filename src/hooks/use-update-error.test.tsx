import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useUpdateComponent } from "./components/use-update-component";
import { useUpdateMeeting } from "./meetings/use-update-meeting";
import { useUpdateRole } from "./roles/use-update-role";
import { useUpdateStaffMember } from "./staff/use-update-staff-member";
import { useUpdateStudent } from "./students/use-update-student";

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

describe("hooks de atualização", () => {
	it("propaga mensagens específicas do servidor", async () => {
		vi.spyOn(globalThis, "fetch").mockImplementation(
			async () =>
				new Response(JSON.stringify({ error: "Registro inválido" }), {
					status: 400,
				}),
		);
		const hooks = [
			() => useUpdateComponent("component-1"),
			() => useUpdateRole("role-1"),
			() => useUpdateStaffMember("staff-1"),
			() => useUpdateStudent("student-1"),
			() => useUpdateMeeting("meeting-1"),
		];
		for (const useHook of hooks) {
			const { result } = renderHook<MutationLike, void>(
				() => (useHook as unknown as () => MutationLike)(),
				{ wrapper },
			);
			result.current.mutate({ name: "Novo", title: "Novo" });
			await waitFor(() => expect(result.current.isError).toBe(true));
			expect(result.current.error?.message).toBe("Registro inválido");
		}
	});

	it("usa mensagens padrão quando o corpo de erro não traz error", async () => {
		vi.spyOn(globalThis, "fetch").mockImplementation(
			async () => new Response("{}", { status: 500 }),
		);
		const hooks = [
			() => useUpdateComponent("component-1"),
			() => useUpdateRole("role-1"),
			() => useUpdateStaffMember("staff-1"),
			() => useUpdateStudent("student-1"),
			() => useUpdateMeeting("meeting-1"),
		];
		const expected = [
			"Falha ao atualizar componente",
			"Falha ao atualizar cargo",
			"Falha ao atualizar servidor",
			"Falha ao atualizar estudante",
			"Falha ao atualizar reunião",
		];
		for (const [index, useHook] of hooks.entries()) {
			const { result } = renderHook<MutationLike, void>(
				() => (useHook as unknown as () => MutationLike)(),
				{ wrapper },
			);
			result.current.mutate({ name: "Novo" });
			await waitFor(() => expect(result.current.isError).toBe(true));
			expect(result.current.error?.message).toBe(expected[index]);
		}
	});
});
