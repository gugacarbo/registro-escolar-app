import { useMutation, useQueryClient } from "@tanstack/react-query";

import type {
	CreateMinuteTemplateInput,
	MinuteTemplate,
} from "#/lib/minutes/schema";

import { getMinuteTemplatesQueryKey } from "./use-minute-templates";

export type { CreateMinuteTemplateInput };

export function useCreateMinuteTemplate() {
	const queryClient = useQueryClient();

	return useMutation<MinuteTemplate, Error, CreateMinuteTemplateInput>({
		mutationFn: async (data) => {
			const response = await fetch("/api/minute-templates", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});
			if (!response.ok) {
				const body = (await response.json().catch(() => ({}))) as {
					error?: string;
				};
				throw new Error(body.error ?? "Falha ao criar preset de ata");
			}
			return response.json() as Promise<MinuteTemplate>;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: getMinuteTemplatesQueryKey(),
			});
		},
	});
}
