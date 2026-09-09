import type { Component } from "#/lib/components/schema";
import type { Offer } from "./schema";

export type ListOffersOptions = {
	limit?: number;
	offset?: number;
};

/** Oferta com relations carregadas: componente e professores (staff). */
export type OfferWithRelations = Offer & {
	component?: Component;
	professors?: Array<{
		id: string;
		staffId: string;
		staff?: { id: string; name: string };
	}>;
};
