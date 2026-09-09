import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { classOffers } from "#/db/schema";

// Payload do POST /api/classes/:id/offers (spec 0004): { componenteId, professorIds }.
// A base vem do schema Drizzle de class_offers; o mapeamento componenteId →
// componentId fica na rota (padrão docs/context/CONVENTIONS.md).
export const createOfferApiSchema = createInsertSchema(classOffers)
	.omit({
		id: true,
		classId: true,
		createdAt: true,
		updatedAt: true,
	})
	.extend({
		componentId: createInsertSchema(classOffers).shape.componentId.min(
			1,
			"Componente é obrigatório",
		),
		professorIds: z.array(z.string().min(1, "Professor inválido")).default([]),
	});

export const selectOfferSchema = createSelectSchema(classOffers);

export type CreateOfferApiInput = z.infer<typeof createOfferApiSchema>;
export type Offer = z.infer<typeof selectOfferSchema>;
