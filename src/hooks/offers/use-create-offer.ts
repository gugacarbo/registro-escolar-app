import { useMutation } from "@tanstack/react-query";

import type { Offer } from "#/lib/offers/schema";

export type CreateOfferValues = {
	turmaId: string;
	componenteId: string;
	professorIds: string[];
};

export function useCreateOffer() {
	return useMutation<Offer, Error, CreateOfferValues>({
		mutationFn: async (data) => {
			const response = await fetch(`/api/classes/${data.turmaId}/offers`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					componenteId: data.componenteId,
					professorIds: data.professorIds,
				}),
			});
			if (!response.ok) {
				const body = (await response.json().catch(() => ({}))) as {
					error?: string;
				};
				throw new Error(body.error ?? "Falha ao criar oferta");
			}
			return response.json() as Promise<Offer>;
		},
	});
}
