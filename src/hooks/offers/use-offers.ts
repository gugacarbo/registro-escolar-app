import { useQuery } from "@tanstack/react-query";

import type { OfferWithRelations } from "#/lib/offers/types";

export function useOffers(classId: string) {
	return useQuery<OfferWithRelations[]>({
		queryKey: ["classes", classId, "offers"],
		queryFn: async () => {
			const response = await fetch(`/api/classes/${classId}/offers`);
			if (!response.ok) {
				throw new Error("Falha ao carregar ofertas da turma");
			}
			return response.json() as Promise<OfferWithRelations[]>;
		},
		enabled: classId.length > 0,
		staleTime: 30_000,
		gcTime: 5 * 60_000,
	});
}
