import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useUpdateMinuteTemplate } from "./use-update-minute-template";

const template = {
	id: "template-1",
	name: "Modelo atualizado",
	headerText: "Cabeçalho",
	footerText: "Rodapé",
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

describe("useUpdateMinuteTemplate", () => {
	it("atualiza o template e invalida as chaves de consulta", async () => {
		const client = new QueryClient({
			defaultOptions: {
				queries: { retry: false },
				mutations: { retry: false },
			},
		});
		const invalidateSpy = vi.spyOn(client, "invalidateQueries");
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve(template),
		});
		vi.stubGlobal("fetch", fetchMock);

		const wrapper = ({ children }: { children: ReactNode }) =>
			createElement(QueryClientProvider, { client }, children);

		const { result } = renderHook(() => useUpdateMinuteTemplate("template-1"), {
			wrapper,
		});

		result.current.mutate({
			name: "Modelo atualizado",
			headerText: "Cabeçalho",
			footerText: "Rodapé",
			showMeeting: true,
			showClasses: true,
			showParticipants: true,
			showRecords: true,
			showGeneralReports: true,
			showSignatures: true,
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(fetchMock).toHaveBeenCalledWith("/api/minute-templates/template-1", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				name: "Modelo atualizado",
				headerText: "Cabeçalho",
				footerText: "Rodapé",
				showMeeting: true,
				showClasses: true,
				showParticipants: true,
				showRecords: true,
				showGeneralReports: true,
				showSignatures: true,
			}),
		});
		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: ["minute-templates"],
		});
		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: ["minute-templates", "template-1"],
		});
	});

	it("propaga erro retornado pelo servidor", async () => {
		const client = new QueryClient({
			defaultOptions: {
				queries: { retry: false },
				mutations: { retry: false },
			},
		});
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: false,
				json: () => Promise.resolve({ error: "Template não encontrado" }),
			}),
		);

		const wrapper = ({ children }: { children: ReactNode }) =>
			createElement(QueryClientProvider, { client }, children);

		const { result } = renderHook(() => useUpdateMinuteTemplate("template-1"), {
			wrapper,
		});

		result.current.mutate({
			name: "Nome",
			headerText: "",
			footerText: "",
			showMeeting: true,
			showClasses: true,
			showParticipants: true,
			showRecords: true,
			showGeneralReports: true,
			showSignatures: true,
		});

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error?.message).toBe("Template não encontrado");
	});

	it("usa mensagem padrão quando o corpo não contém erro", async () => {
		const client = new QueryClient({
			defaultOptions: {
				queries: { retry: false },
				mutations: { retry: false },
			},
		});
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: false,
				json: () => Promise.reject(new Error("corpo inválido")),
			}),
		);

		const wrapper = ({ children }: { children: ReactNode }) =>
			createElement(QueryClientProvider, { client }, children);

		const { result } = renderHook(() => useUpdateMinuteTemplate("template-1"), {
			wrapper,
		});

		result.current.mutate({
			name: "Nome",
			headerText: "",
			footerText: "",
			showMeeting: true,
			showClasses: true,
			showParticipants: true,
			showRecords: true,
			showGeneralReports: true,
			showSignatures: true,
		});

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error?.message).toBe(
			"Falha ao atualizar template de ata",
		);
	});
});
