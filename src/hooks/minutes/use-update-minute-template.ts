import { useMutation, useQueryClient } from "@tanstack/react-query";

import type {
	MinuteTemplate,
	UpdateMinuteTemplateInput,
} from "#/lib/minutes/schema";

import { getMinuteTemplateQueryKey } from "./use-minute-template";
import { getMinuteTemplatesQueryKey } from "./use-minute-templates";

export function useUpdateMinuteTemplate(id: string) {
	const queryClient = useQueryClient();

	return useMutation<MinuteTemplate, Error, UpdateMinuteTemplateInput>({
		mutationFn: async (data) => {
			const response = await fetch(`/api/minute-templates/${id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});
			if (!response.ok) {
				const body = (await response.json().catch(() => ({}))) as {
					error?: string;
				};
				throw new Error(body.error ?? "Falha ao atualizar preset de ata");
			}
			return response.json() as Promise<MinuteTemplate>;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: getMinuteTemplatesQueryKey() });
			queryClient.invalidateQueries({
				queryKey: getMinuteTemplateQueryKey(id),
			});
		},
	});
}
