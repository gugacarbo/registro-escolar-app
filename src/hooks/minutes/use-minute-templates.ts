import { useQuery } from "@tanstack/react-query";

import type { MinuteTemplate } from "#/lib/minutes/schema";

export function getMinuteTemplatesQueryKey() {
	return ["minute-templates"];
}

export function useMinuteTemplates() {
	return useQuery<MinuteTemplate[]>({
		queryKey: getMinuteTemplatesQueryKey(),
		queryFn: async () => {
			const response = await fetch("/api/minute-templates");
			if (!response.ok) {
				const body = (await response.json().catch(() => ({}))) as {
					error?: string;
				};
				throw new Error(body.error ?? "Falha ao carregar presets de ata");
			}
			return response.json() as Promise<MinuteTemplate[]>;
		},
		staleTime: 30_000,
	});
}
