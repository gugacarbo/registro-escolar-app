import { useMutation, useQueryClient } from "@tanstack/react-query";

import { getClassesQueryKey } from "#/hooks/classes/use-classes";

export type CreateEnrollmentValues = {
	estudanteId: string;
	turmaId: string;
	dataInicio: string;
	dataTermino?: string;
	status?: string;
};

export type CreateEnrollmentResult = {
	enrollment: unknown;
	closedEnrollments: unknown[];
};

export function useCreateEnrollment() {
	const queryClient = useQueryClient();

	return useMutation<CreateEnrollmentResult, Error, CreateEnrollmentValues>({
		mutationFn: async (data) => {
			const response = await fetch("/api/enrollments", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});
			if (!response.ok) {
				const body = (await response.json().catch(() => ({}))) as {
					error?: string;
				};
				throw new Error(body.error ?? "Falha ao matricular estudante");
			}
			return response.json() as Promise<CreateEnrollmentResult>;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["enrollments"] });
			queryClient.invalidateQueries({ queryKey: getClassesQueryKey() });
		},
	});
}
