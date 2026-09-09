import { eq } from "drizzle-orm";

import type { DB } from "#/db";
import { classOffers, offerProfessors } from "#/db/schema";
import { findActiveStaffById } from "#/lib/staff/repository";

import type { CreateOfferApiInput } from "./schema";
import type { OfferWithRelations } from "./types";

export const ERR_DUPLICATE_OFFER = "Componente já ofertado nesta turma";
export const ERR_INVALID_PROFESSOR = "Professor inválido ou inativo";

export class DuplicateOfferError extends Error {}
export class InvalidProfessorError extends Error {}

export async function findOfferByClassAndComponent(
	db: DB,
	classId: string,
	componentId: string,
) {
	return db.query.classOffers.findFirst({
		where: (offer, { and }) =>
			and(eq(offer.classId, classId), eq(offer.componentId, componentId)),
	});
}

// Nota: db.transaction não é usado porque DB é a união
// DrizzleD1Database | BetterSQLite3Database, cujas assinaturas divergem;
// a oferta e seus professores são gravados sequencialmente (padrão
// createMeetingWithRelations em src/lib/meetings/repository.ts).
export async function createOffer(
	db: DB,
	input: {
		classId: string;
		componentId: string;
		professorIds?: string[];
	},
) {
	// Borda 4: mesma turma + mesmo componente → duplicidade rejeitada.
	const existing = await findOfferByClassAndComponent(
		db,
		input.classId,
		input.componentId,
	);
	if (existing) {
		throw new DuplicateOfferError(ERR_DUPLICATE_OFFER);
	}

	const offer = await db
		.insert(classOffers)
		.values({
			id: crypto.randomUUID(),
			classId: input.classId,
			componentId: input.componentId,
		})
		.returning()
		.get();

	// Borda 2: professorIds vazio → oferta sem professores é permitida.
	// Borda 3: professor precisa ser servidor cadastrado e ativo.
	for (const staffId of [...new Set(input.professorIds ?? [])]) {
		const professor = await findActiveStaffById(db, staffId);
		if (!professor) {
			throw new InvalidProfessorError(ERR_INVALID_PROFESSOR);
		}
		await db
			.insert(offerProfessors)
			.values({
				id: crypto.randomUUID(),
				offerId: offer.id,
				staffId,
			})
			.returning()
			.get();
	}
	return offer;
}

/** Listagem com relations: componente da oferta e professores vinculados. */
export async function listOffersByClass(
	db: DB,
	classId: string,
): Promise<OfferWithRelations[]> {
	return db.query.classOffers.findMany({
		where: eq(classOffers.classId, classId),
		orderBy: (offers, { desc }) => [desc(offers.createdAt)],
		with: {
			component: true,
			professors: {
				with: {
					staff: true,
				},
			},
		},
	});
}
