import { useQuery } from "@tanstack/react-query";

import type { MinuteTemplate } from "#/lib/minutes/schema";

export function getMinuteTemplateQueryKey(id: string) {
	return ["minute-templates", id];
}

export function useMinuteTemplate(id: string) {
	return useQuery<MinuteTemplate>({
		queryKey: getMinuteTemplateQueryKey(id),
		queryFn: async () => {
			const response = await fetch(`/api/minute-templates/${id}`);
			if (!response.ok) {
				const body = (await response.json().catch(() => ({}))) as {
					error?: string;
				};
				throw new Error(body.error ?? "Falha ao carregar modelo de ata");
			}
			return response.json() as Promise<MinuteTemplate>;
		},
		enabled: !!id,
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}
