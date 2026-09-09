import { createFileRoute } from "@tanstack/react-router";

import { createDb } from "#/db";
import { getSession } from "#/lib/auth/session";
import { findClassById } from "#/lib/classes/repository";
import { getRuntimeEnv, requireD1 } from "#/lib/cloudflare-env";
import { findComponentById } from "#/lib/components/repository";
import {
	createOffer,
	DuplicateOfferError,
	InvalidProfessorError,
	listOffersByClass,
} from "#/lib/offers/repository";
import { createOfferApiSchema } from "#/lib/offers/schema";
import { d1Middleware } from "#/middleware/d1";

export const Route = createFileRoute("/api/classes/$id/offers")({
	server: {
		middleware: [d1Middleware],
		handlers: {
			GET: listOffersHandler,
			POST: createOfferHandler,
		},
	},
});

function json(body: unknown, status: number) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

export async function listOffersHandler({
	request,
	context,
	params,
}: {
	request: Request;
	context: { env?: Env };
	params: { id: string };
}) {
	const env = context.env ?? (await getRuntimeEnv());
	const session = await getSession(request, env);
	if (!session) {
		return json({ error: "Não autenticado" }, 401);
	}

	const db = createDb(requireD1(env));
	const classRow = await findClassById(db, params.id);
	if (!classRow) {
		return json({ error: "Turma não encontrada" }, 404);
	}

	const offers = await listOffersByClass(db, params.id);
	return json(offers, 200);
}

export async function createOfferHandler({
	request,
	context,
	params,
}: {
	request: Request;
	context: { env?: Env };
	params: { id: string };
}) {
	const env = context.env ?? (await getRuntimeEnv());
	const session = await getSession(request, env);
	if (!session) {
		return json({ error: "Não autenticado" }, 401);
	}

	const body = (await request.json()) as Record<string, unknown>;

	// Payload da spec usa `componenteId`; a coluna/zod usa `componentId`.
	// O mapeamento fica na rota (padrão docs/context/CONVENTIONS.md).
	const rawComponenteId =
		typeof body.componenteId === "string" ? body.componenteId : undefined;
	const parsed = createOfferApiSchema.safeParse(
		rawComponenteId !== undefined
			? { ...body, componentId: rawComponenteId }
			: body,
	);
	if (!parsed.success) {
		return json({ error: "Dados inválidos", issues: parsed.error.issues }, 400);
	}

	const db = createDb(requireD1(env));
	const componentId = rawComponenteId ?? parsed.data.componentId;

	const classRow = await findClassById(db, params.id);
	if (!classRow) {
		return json({ error: "Turma não encontrada" }, 404);
	}

	const component = await findComponentById(db, componentId);
	if (!component) {
		return json({ error: "Componente não encontrado" }, 404);
	}

	try {
		const offer = await createOffer(db, {
			classId: params.id,
			componentId,
			professorIds: parsed.data.professorIds,
		});
		return json(offer, 201);
	} catch (error) {
		if (error instanceof DuplicateOfferError) {
			return json({ error: error.message }, 409);
		}
		if (error instanceof InvalidProfessorError) {
			return json({ error: error.message }, 400);
		}
		throw error;
	}
}
