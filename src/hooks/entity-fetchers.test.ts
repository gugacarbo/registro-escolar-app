import { afterEach, describe, expect, it, vi } from "vitest";

import {
	fetchClassesPage,
	fetchComponentsPage,
	fetchMeetingsPage,
	fetchRolesPage,
	fetchStaffPage,
	fetchStudentsPage,
} from "./entity-fetchers";

afterEach(() => vi.restoreAllMocks());

describe("entity-fetchers", () => {
	it("monta query com busca e paginação", async () => {
		const spy = vi
			.spyOn(globalThis, "fetch")
			.mockImplementation(
				async () => new Response(JSON.stringify({ data: [], total: 0 })),
			);
		await fetchStudentsPage({ search: "ana", page: 2, pageSize: 25 });
		expect(spy.mock.calls[0][0]).toContain("/api/students?");
		expect(String(spy.mock.calls[0][0])).toContain("search=ana");
		expect(String(spy.mock.calls[0][0])).toContain("page=2");
	});

	it("busca turmas, servidores, cargos, componentes e reuniões", async () => {
		const body = () => JSON.stringify({ data: [], total: 0 });
		const spy = vi
			.spyOn(globalThis, "fetch")
			.mockImplementation(async () => new Response(body()));
		await fetchClassesPage({ page: 1, pageSize: 100 });
		await fetchStaffPage({ page: 1, pageSize: 100 });
		await fetchRolesPage({ page: 1, pageSize: 100 });
		await fetchComponentsPage({ page: 1, pageSize: 100 });
		await fetchMeetingsPage({
			page: 1,
			pageSize: 100,
			search: "conselho",
			status: "draft",
		});
		expect(spy).toHaveBeenCalledTimes(5);
	});

	it("monta query de reuniões com filtros opcionais", async () => {
		const spy = vi
			.spyOn(globalThis, "fetch")
			.mockImplementation(
				async () => new Response(JSON.stringify({ data: [], total: 0 })),
			);
		await fetchMeetingsPage({
			search: "conselho",
			status: "draft",
			page: 3,
			pageSize: 50,
		});
		const url = String(spy.mock.calls[0][0]);
		expect(url).toContain("/api/meetings?");
		expect(url).toContain("search=conselho");
		expect(url).toContain("status=draft");
		expect(url).toContain("page=3");
		expect(url).toContain("pageSize=50");
	});

	it("propaga erro na busca de reuniões", async () => {
		vi.spyOn(globalThis, "fetch").mockImplementation(
			async () => new Response(JSON.stringify({ error: "x" }), { status: 500 }),
		);
		await expect(fetchMeetingsPage({ page: 1, pageSize: 10 })).rejects.toThrow(
			"Falha ao carregar /api/meetings",
		);
	});

	it("propaga erro da API", async () => {
		vi.spyOn(globalThis, "fetch").mockImplementation(
			async () => new Response(JSON.stringify({ error: "x" }), { status: 500 }),
		);
		await expect(fetchStaffPage({ page: 1, pageSize: 10 })).rejects.toThrow();
	});
});
