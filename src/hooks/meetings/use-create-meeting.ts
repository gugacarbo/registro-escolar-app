import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { Meeting } from "#/lib/meetings/schema";

import { getMeetingsQueryKey } from "./use-meetings";

export type CreateMeetingValues = {
	title: string;
	heldAt?: string;
	templateId?: string | null;
	classIds?: string[];
	participants?: Array<{ staffId: string; roleId: string }>;
};

export function useCreateMeeting() {
	const queryClient = useQueryClient();

	return useMutation<Meeting, Error, CreateMeetingValues>({
		mutationFn: async (data) => {
			const response = await fetch("/api/meetings", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});
			if (!response.ok) {
				const body = (await response.json().catch(() => ({}))) as {
					error?: string;
				};
				throw new Error(body.error ?? "Falha ao criar reunião");
			}
			return response.json() as Promise<Meeting>;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: getMeetingsQueryKey() });
		},
	});
}
