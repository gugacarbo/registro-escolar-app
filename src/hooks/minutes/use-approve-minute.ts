import { useMutation, useQueryClient } from "@tanstack/react-query";

export type ApproveMinuteValues = {
	data?: string;
	observacao?: string;
};

type ApproveMinuteResult = {
	id: string;
	meetingId: string;
	approvalStatus: string;
	approvedAt: string | null;
	approvalNotes: string | null;
};

export function useApproveMinute(meetingId: string) {
	const queryClient = useQueryClient();

	return useMutation<ApproveMinuteResult, Error, ApproveMinuteValues>({
		mutationFn: async (data) => {
			const response = await fetch(
				`/api/meetings/${meetingId}/minutes/approve`,
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(data),
				},
			);
			if (!response.ok) {
				const body = (await response.json().catch(() => ({}))) as {
					error?: string;
				};
				throw new Error(body.error ?? "Falha ao aprovar ata");
			}
			return response.json() as Promise<ApproveMinuteResult>;
		},
		onSuccess: () => {
			// ["minutes"] cobre a prévia/versões e a lista paginada de atas.
			queryClient.invalidateQueries({ queryKey: ["minutes"] });
		},
	});
}
