import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
	useCreateLinkedRecord,
	useMeetingStudentRecords,
	useSetRecordInclusion,
	useUpdateLinkedRecord,
} from "./use-records";

const record = {
	id: "record-1",
	studentId: "student-1",
	meetingId: "meeting-1",
	texto: "Registro",
	scope: "vinculado",
	includeInMinutes: true,
	classId: null,
	componentId: null,
	originId: null,
	categoriaId: null,
	createdAt: "2026-01-01T00:00:00Z",
	updatedAt: "2026-01-01T00:00:00Z",
} as const;

function wrapper({ children }: { children: ReactNode }) {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe("hooks de registros do estudante", () => {
	it("carrega registros do estudante na reunião", async () => {
		const fetchMock = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ records: [record] })),
			);
		const { result } = renderHook(
			() => useMeetingStudentRecords("meeting-1", "student-1"),
			{ wrapper },
		);
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(fetchMock).toHaveBeenCalledWith(
			"/api/meetings/meeting-1/students/student-1/records",
		);
		expect(result.current.data?.records).toEqual([record]);
	});

	it("cria registro vinculado e invalida a query", async () => {
		const fetchMock = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValueOnce(
				new Response(JSON.stringify(record), { status: 201 }),
			)
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ records: [record] })),
			);
		const client = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		function Wrapper({ children }: { children: ReactNode }) {
			return (
				<QueryClientProvider client={client}>{children}</QueryClientProvider>
			);
		}
		await client.prefetchQuery({
			queryKey: ["meetings", "meeting-1", "students", "student-1", "records"],
			queryFn: () => Promise.resolve({ records: [] }),
		});
		const { result } = renderHook(() => useCreateLinkedRecord("meeting-1"), {
			wrapper: Wrapper,
		});
		result.current.mutate({
			studentId: "student-1",
			texto: "Registro",
			componenteId: null,
			origemId: null,
			incluirNaAta: true,
		});
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(fetchMock).toHaveBeenNthCalledWith(
			1,
			"/api/meetings/meeting-1/students/student-1/records",
			expect.objectContaining({ method: "POST" }),
		);
	});

	it("edita registro vinculado pela rota de reunião", async () => {
		const fetchMock = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValue(new Response(JSON.stringify(record)));
		const { result } = renderHook(() => useUpdateLinkedRecord("meeting-1"), {
			wrapper,
		});
		result.current.mutate({
			studentId: "student-1",
			recordId: "record-1",
			texto: "Editado",
			componenteId: null,
			origemId: null,
			incluirNaAta: false,
		});
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(fetchMock).toHaveBeenCalledWith(
			"/api/meetings/meeting-1/records/record-1",
			expect.objectContaining({ method: "PATCH" }),
		);
	});

	it("alterna inclusão de registro independente", async () => {
		const fetchMock = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValue(new Response(JSON.stringify({ include: false })));
		const { result } = renderHook(() => useSetRecordInclusion("meeting-1"), {
			wrapper,
		});
		result.current.mutate({
			studentId: "student-1",
			record,
			incluir: false,
		});
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(fetchMock).toHaveBeenCalledWith(
			"/api/meetings/meeting-1/students/student-1/records/record-1/include",
			expect.objectContaining({ method: "PATCH" }),
		);
	});

	it("propaga mensagem de erro da API", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(JSON.stringify({ error: "Texto obrigatório" }), {
				status: 400,
			}),
		);
		const { result } = renderHook(() => useCreateLinkedRecord("meeting-1"), {
			wrapper,
		});
		result.current.mutate({
			studentId: "student-1",
			texto: " ",
			componenteId: null,
			origemId: null,
		});
		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error?.message).toBe("Texto obrigatório");
	});
});
