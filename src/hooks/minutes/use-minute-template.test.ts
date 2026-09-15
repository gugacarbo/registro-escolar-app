import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { textDoc } from "#/lib/minutes/tiptap/serializer";
import {
	getMinuteTemplateQueryKey,
	useMinuteTemplate,
} from "./use-minute-template";

function createWrapper() {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	return function wrapper({ children }: { children: ReactNode }) {
		return createElement(QueryClientProvider, { client }, children);
	};
}

const template = {
	id: "template-1",
	name: "Modelo padrão",
	headerContent: JSON.stringify(textDoc("Cabeçalho")),
	footerContent: JSON.stringify(textDoc("Rodapé")),
	showMeeting: true,
	showClasses: true,
	showParticipants: true,
	showRecords: true,
	showGeneralReports: true,
	showSignatures: true,
	createdAt: new Date(),
	updatedAt: new Date(),
};

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("useMinuteTemplate", () => {
	it("gera a query key com o id", () => {
		expect(getMinuteTemplateQueryKey("tpl-1")).toEqual([
			"minute-templates",
			"tpl-1",
		]);
	});

	it("carrega o template pelo id", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve(template),
		});
		vi.stubGlobal("fetch", fetchMock);

		const { result } = renderHook(() => useMinuteTemplate("template-1"), {
			wrapper: createWrapper(),
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.data).toEqual(template);
		expect(fetchMock).toHaveBeenCalledWith("/api/minute-templates/template-1");
	});

	it("propaga a mensagem de erro do servidor", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: false,
				json: () =>
					Promise.resolve({ error: "Template de ata não encontrado" }),
			}),
		);

		const { result } = renderHook(() => useMinuteTemplate("template-1"), {
			wrapper: createWrapper(),
		});

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error?.message).toBe(
			"Template de ata não encontrado",
		);
	});

	it("usa mensagem padrão quando o corpo não contém erro estruturado", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: false,
				json: () => Promise.reject(new Error("não é json")),
			}),
		);

		const { result } = renderHook(() => useMinuteTemplate("template-1"), {
			wrapper: createWrapper(),
		});

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error?.message).toBe(
			"Falha ao carregar template de ata",
		);
	});

	it("não executa a consulta quando o id está vazio", () => {
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);

		const { result } = renderHook(() => useMinuteTemplate(""), {
			wrapper: createWrapper(),
		});

		expect(result.current.fetchStatus).toBe("idle");
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
