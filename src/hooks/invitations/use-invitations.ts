import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface InvitationItem {
	id: string;
	email: string;
	invitedById: string;
	token: string;
	status: "pending" | "accepted" | "expired" | "revoked";
	expiresAt: string | Date;
	createdAt: string | Date;
	acceptedAt: string | Date | null;
}

export interface InvitationsResponse {
	data: InvitationItem[];
	pendingCount: number;
	maxPending: number;
}

export function useInvitations() {
	return useQuery<InvitationsResponse>({
		queryKey: ["invitations"],
		queryFn: async () => {
			const res = await fetch("/api/invitations");
			if (!res.ok) {
				const error = (await res.json().catch(() => ({}))) as {
					error?: string;
				};
				throw new Error(error.error || "Erro ao carregar convites");
			}
			return res.json() as Promise<InvitationsResponse>;
		},
	});
}

export function useCreateInvitation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ email }: { email: string }) => {
			const res = await fetch("/api/invitations", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email }),
			});

			const data = (await res.json().catch(() => ({}))) as {
				error?: string;
			};
			if (!res.ok) {
				throw new Error(data.error || "Erro ao enviar convite");
			}
			return data as InvitationItem;
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["invitations"] });
		},
	});
}

export function useRevokeInvitation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string) => {
			const res = await fetch(`/api/invitations/${id}`, {
				method: "DELETE",
			});

			const data = (await res.json().catch(() => ({}))) as {
				error?: string;
			};
			if (!res.ok) {
				throw new Error(data.error || "Erro ao cancelar convite");
			}
			return data;
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["invitations"] });
		},
	});
}
